import * as fs from 'fs';
import * as path from 'path';
import type { Agent, MCState } from './types';
import { generateId, slugify, logsDir } from './utils';
import { addAgent, loadState, updateAgent } from './state';
import { createWorktree } from './worktree';

export function spawnAgent(state: MCState, task: string): Agent {
  const id = generateId();
  const slug = slugify(task);
  const branch = `mc/${id}-${slug}`;
  const worktreePath = createWorktree(state.repoRoot, branch);
  const logFile = path.join(logsDir(state.repoRoot), `${id}.jsonl`);

  // Create empty log file
  fs.writeFileSync(logFile, '');

  // Build clean env — remove CLAUDE vars that would block subprocess
  const cleanEnv: Record<string, string> = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (val !== undefined && !key.startsWith('CLAUDE')) {
      cleanEnv[key] = val;
    }
  }

  // Spawn the runner script as a detached background process
  const runnerPath = path.join(import.meta.dir, 'runner.ts');
  const proc = Bun.spawn(
    ['bun', 'run', runnerPath, state.repoRoot, id, task, worktreePath, logFile],
    {
      cwd: worktreePath,
      env: cleanEnv,
      stdio: ['ignore', 'ignore', 'ignore'],
    }
  );
  proc.unref();

  const agent: Agent = {
    id,
    task,
    branch,
    worktreePath,
    pid: proc.pid,
    logFile,
    status: 'running',
    lastMessage: 'Starting...',
    turns: 0,
    costUsd: 0,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };

  addAgent(state, agent);
  return agent;
}

export function killAgent(state: MCState, id: string): void {
  const agent = state.agents.find(a => a.id === id || a.id.startsWith(id));
  if (!agent) throw new Error(`Agent ${id} not found`);
  if (agent.status !== 'running') throw new Error(`Agent ${id} is not running (${agent.status})`);

  if (agent.pid) {
    try {
      process.kill(agent.pid, 'SIGTERM');
      // Give it 3s then force kill
      setTimeout(() => {
        try { process.kill(agent.pid!, 'SIGKILL'); } catch {}
      }, 3000);
    } catch {}
  }

  updateAgent(state, agent.id, {
    status: 'killed',
    finishedAt: new Date().toISOString(),
  });
}
