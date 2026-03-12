#!/usr/bin/env bun

import * as fs from 'fs';
import { findRepoRoot, getCurrentBranch } from './utils';
import { loadState, initState, getAgent, removeAgent, refreshStatuses } from './state';
import { spawnAgent, killAgent } from './spawner';
import { removeWorktree, mergeWorktree } from './worktree';
import type { MCState } from './types';

function getOrInitState(): MCState {
  const repoRoot = findRepoRoot();
  let state = loadState(repoRoot);
  if (!state) {
    const branch = getCurrentBranch();
    state = initState(repoRoot, branch);
  }
  refreshStatuses(state);
  return state;
}

function printUsage(): void {
  console.log(`
  miniconductor — parallel Claude Code agents in git worktrees

  Usage:
    mcon                     Show agent dashboard (TUI)
    mcon spawn "task"        Start a new agent with the given task
    mcon status              Show agent dashboard (TUI)
    mcon log <id>            Print agent's full output log
    mcon merge <id>          Merge agent's branch into current branch
    mcon kill <id>           Stop a running agent
    mcon clean               Remove all finished worktrees and branches
    mcon help                Show this help message
  `);
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'spawn': {
      const task = args.join(' ');
      if (!task) {
        console.error('Usage: mc spawn "task description"');
        process.exit(1);
      }
      const state = getOrInitState();
      const agent = spawnAgent(state, task);
      console.log(`Agent ${agent.id} spawned on branch ${agent.branch}`);
      console.log(`Worktree: ${agent.worktreePath}`);
      console.log(`Log: mc log ${agent.id}`);
      break;
    }

    case 'log': {
      const id = args[0];
      if (!id) {
        console.error('Usage: mc log <id>');
        process.exit(1);
      }
      const state = getOrInitState();
      const agent = getAgent(state, id);
      if (!agent) {
        console.error(`Agent ${id} not found`);
        process.exit(1);
      }
      if (fs.existsSync(agent.logFile)) {
        const log = fs.readFileSync(agent.logFile, 'utf-8');

        if (args.includes('--json')) {
          const events: any[] = [];
          for (const line of log.split('\n')) {
            if (!line.trim()) continue;
            try { events.push(JSON.parse(line)); } catch {}
          }
          console.log(JSON.stringify(events));
          break;
        }

        // Parse JSONL and print text content
        for (const line of log.split('\n')) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'assistant' && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === 'text' && block.text) {
                  console.log(block.text);
                }
                if (block.type === 'tool_use') {
                  console.log(`[tool: ${block.name}]`);
                }
              }
            }
            if (event.type === 'result') {
              console.log(`\n--- Result: ${event.is_error ? 'FAILED' : 'SUCCESS'} | Turns: ${event.num_turns || '?'} | Cost: $${event.cost_usd?.toFixed(2) || '?'} ---`);
            }
          } catch {
            // Raw line, print as-is
            console.log(line);
          }
        }
      } else {
        if (args.includes('--json')) {
          console.log(JSON.stringify([]));
          break;
        }
        console.log('No log file yet.');
      }
      break;
    }

    case 'merge': {
      const id = args[0];
      if (!id) {
        console.error('Usage: mc merge <id>');
        process.exit(1);
      }
      const state = getOrInitState();
      const agent = getAgent(state, id);
      if (!agent) {
        console.error(`Agent ${id} not found`);
        process.exit(1);
      }
      if (agent.status === 'running') {
        console.error(`Agent ${agent.id} is still running. Kill it first or wait for it to finish.`);
        process.exit(1);
      }
      const result = mergeWorktree(state.repoRoot, agent.branch);
      if (result.ok) {
        console.log(`Merged ${agent.branch} into current branch.`);
        console.log(result.output);
      } else {
        console.error(`Merge failed. Resolve conflicts manually.`);
        console.error(result.output);
        process.exit(1);
      }
      break;
    }

    case 'kill': {
      const id = args[0];
      if (!id) {
        console.error('Usage: mc kill <id>');
        process.exit(1);
      }
      const state = getOrInitState();
      const agent = getAgent(state, id);
      if (!agent) {
        console.error(`Agent ${id} not found`);
        process.exit(1);
      }
      killAgent(state, agent.id);
      console.log(`Agent ${agent.id} killed.`);
      break;
    }

    case 'clean': {
      const state = getOrInitState();
      const finished = state.agents.filter(a => a.status !== 'running');
      if (finished.length === 0) {
        console.log('Nothing to clean.');
        break;
      }
      for (const agent of finished) {
        try {
          removeWorktree(state.repoRoot, agent.worktreePath, agent.branch);
        } catch {}
        // Remove log file
        if (fs.existsSync(agent.logFile)) {
          fs.unlinkSync(agent.logFile);
        }
        removeAgent(state, agent.id);
        console.log(`Cleaned ${agent.id} (${agent.branch})`);
      }
      break;
    }

    case 'help':
    case '--help':
    case '-h': {
      printUsage();
      break;
    }

    case 'status':
    case undefined: {
      const repoRoot = findRepoRoot();
      const state = loadState(repoRoot);
      if (!state || state.agents.length === 0) {
        if (args.includes('--json')) {
          console.log(JSON.stringify({ repoRoot, baseBranch: '', agents: [] }));
        } else {
          console.log('miniconductor — no agents running');
          console.log('Run `mcon spawn "task"` to start one.');
        }
        break;
      }

      refreshStatuses(state);

      if (args.includes('--json')) {
        console.log(JSON.stringify(state));
        break;
      }

      const { render } = await import('ink');
      const React = await import('react');
      const { App } = await import('./ui/app');
      render(React.createElement(App, { repoRoot }));
      break;
    }

    default: {
      console.error(`Unknown command: ${cmd}`);
      printUsage();
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
