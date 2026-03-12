import * as path from 'path';
import * as crypto from 'crypto';

export function generateId(): string {
  return crypto.randomUUID().slice(0, 7);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function findRepoRoot(): string {
  const result = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel']);
  if (result.exitCode !== 0) {
    throw new Error('Not inside a git repository. Run mc from within a git repo.');
  }
  return result.stdout.toString().trim();
}

export function getCurrentBranch(): string {
  const result = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
  if (result.exitCode !== 0) {
    throw new Error('Failed to get current branch.');
  }
  return result.stdout.toString().trim();
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function stateDir(repoRoot: string): string {
  return path.join(repoRoot, '.miniconductor');
}

export function logsDir(repoRoot: string): string {
  return path.join(repoRoot, '.miniconductor', 'logs');
}

export function worktreesDir(repoRoot: string): string {
  return path.join(repoRoot, '.miniconductor', 'worktrees');
}
