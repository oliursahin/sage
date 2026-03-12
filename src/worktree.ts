import * as path from 'path';
import { worktreesDir } from './utils';

function run(args: string[], cwd: string): { ok: boolean; output: string } {
  const result = Bun.spawnSync(['git', ...args], { cwd });
  const output = result.stdout.toString().trim() + result.stderr.toString().trim();
  return { ok: result.exitCode === 0, output };
}

export function createWorktree(repoRoot: string, branchName: string): string {
  const wtDir = worktreesDir(repoRoot);
  const wtPath = path.join(wtDir, branchName.replace(/\//g, '-'));

  // Prune stale worktrees first
  run(['worktree', 'prune'], repoRoot);

  const result = run(['worktree', 'add', wtPath, '-b', branchName], repoRoot);
  if (!result.ok) {
    throw new Error(`Failed to create worktree: ${result.output}`);
  }
  return wtPath;
}

export function removeWorktree(repoRoot: string, worktreePath: string, branchName: string): void {
  // Remove worktree
  run(['worktree', 'remove', worktreePath, '--force'], repoRoot);
  run(['worktree', 'prune'], repoRoot);

  // Delete branch
  run(['branch', '-D', branchName], repoRoot);
}

export function mergeWorktree(
  repoRoot: string,
  branchName: string
): { ok: boolean; output: string } {
  return run(['merge', '--no-ff', branchName, '-m', `mc: merge ${branchName}`], repoRoot);
}
