export type AgentStatus = 'running' | 'done' | 'failed' | 'killed';

export interface Agent {
  id: string;
  task: string;
  branch: string;
  worktreePath: string;
  pid: number | null;
  logFile: string;
  status: AgentStatus;
  lastMessage: string;
  turns: number;
  costUsd: number;
  createdAt: string;
  finishedAt: string | null;
}

export interface MCState {
  repoRoot: string;
  baseBranch: string;
  agents: Agent[];
}
