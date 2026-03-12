import * as fs from 'fs';
import * as path from 'path';
import type { Agent, MCState } from './types';
import { stateDir, logsDir, worktreesDir, isProcessRunning } from './utils';

function statePath(repoRoot: string): string {
  return path.join(stateDir(repoRoot), 'state.json');
}

function ensureDirs(repoRoot: string): void {
  for (const dir of [stateDir(repoRoot), logsDir(repoRoot), worktreesDir(repoRoot)]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function initState(repoRoot: string, baseBranch: string): MCState {
  ensureDirs(repoRoot);
  const state: MCState = { repoRoot, baseBranch, agents: [] };
  saveState(state);
  return state;
}

export function loadState(repoRoot: string): MCState | null {
  const p = statePath(repoRoot);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    console.error('Warning: state.json corrupted, reinitializing.');
    return null;
  }
}

export function saveState(state: MCState): void {
  ensureDirs(state.repoRoot);
  const p = statePath(state.repoRoot);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, p);
}

export function addAgent(state: MCState, agent: Agent): void {
  state.agents.push(agent);
  saveState(state);
}

export function updateAgent(state: MCState, id: string, updates: Partial<Agent>): void {
  const agent = state.agents.find(a => a.id === id);
  if (!agent) return;
  Object.assign(agent, updates);
  saveState(state);
}

export function getAgent(state: MCState, id: string): Agent | undefined {
  return state.agents.find(a => a.id === id || a.id.startsWith(id));
}

export function removeAgent(state: MCState, id: string): void {
  state.agents = state.agents.filter(a => a.id !== id);
  saveState(state);
}

/** Check running agents' PIDs — mark dead ones as failed */
export function refreshStatuses(state: MCState): void {
  let changed = false;
  for (const agent of state.agents) {
    if (agent.status === 'running' && agent.pid) {
      if (!isProcessRunning(agent.pid)) {
        agent.status = 'failed';
        agent.finishedAt = new Date().toISOString();
        changed = true;
      }
    }
  }
  if (changed) saveState(state);
}
