/**
 * Runner — background process that executes claude -p and updates state.
 * Spawned by spawner.ts, runs detached from the parent.
 *
 * Args: repoRoot, agentId, task, worktreePath, logFile
 */

import * as fs from 'fs';
import { loadState, updateAgent } from './state';

const [repoRoot, agentId, task, worktreePath, logFile] = process.argv.slice(2);

if (!repoRoot || !agentId || !task || !worktreePath || !logFile) {
  console.error('Usage: runner.ts <repoRoot> <agentId> <task> <worktreePath> <logFile>');
  process.exit(1);
}

const maxTurns = process.env.MC_MAX_TURNS || '50';

const proc = Bun.spawn(
  [
    'claude', '-p', task,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', maxTurns,
    '--allowedTools', 'Bash,Read,Edit,Write,Glob,Grep',
  ],
  {
    cwd: worktreePath,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

const logStream = fs.createWriteStream(logFile, { flags: 'a' });
let lastMessage = '';
let turns = 0;
let costUsd = 0;
let lastStateUpdate = 0;
const STATE_UPDATE_INTERVAL = 2000; // ms

function maybeUpdateState(force = false): void {
  const now = Date.now();
  if (!force && now - lastStateUpdate < STATE_UPDATE_INTERVAL) return;
  lastStateUpdate = now;

  const state = loadState(repoRoot);
  if (!state) return;
  updateAgent(state, agentId, { lastMessage, turns, costUsd });
}

function parseLine(line: string): void {
  try {
    const event = JSON.parse(line);

    // Extract text from assistant messages
    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === 'text' && block.text) {
          lastMessage = block.text.slice(0, 120);
        }
        if (block.type === 'tool_use' && block.name) {
          lastMessage = `Using ${block.name}...`;
        }
      }
      turns++;
    }

    // Extract result
    if (event.type === 'result') {
      if (event.cost_usd !== undefined) costUsd = event.cost_usd;
      if (event.num_turns !== undefined) turns = event.num_turns;
    }

    maybeUpdateState();
  } catch {
    // Not valid JSON, ignore
  }
}

// Read stdout line by line
const reader = proc.stdout.getReader();
const decoder = new TextDecoder();
let buffer = '';

async function readLoop(): Promise<void> {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        logStream.write(line + '\n');
        parseLine(line);
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    logStream.write(buffer + '\n');
    parseLine(buffer);
  }
}

// Read stderr too (for debugging)
const stderrReader = proc.stderr.getReader();
async function readStderr(): Promise<void> {
  while (true) {
    const { done, value } = await stderrReader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    logStream.write(`[stderr] ${text}`);
  }
}

// Run both readers, then finalize
await Promise.all([readLoop(), readStderr()]);
await proc.exited;

const exitCode = proc.exitCode;
logStream.end();

// Final state update
const state = loadState(repoRoot);
if (state) {
  const finalStatus = exitCode === 0 ? 'done' : 'failed';
  updateAgent(state, agentId, {
    status: finalStatus as any,
    lastMessage: exitCode === 0 ? 'Completed successfully' : `Exited with code ${exitCode}`,
    turns,
    costUsd,
    finishedAt: new Date().toISOString(),
  });
}
