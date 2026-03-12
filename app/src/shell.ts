import { Command } from '@tauri-apps/plugin-shell';

export async function runMcon(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const mconPath = import.meta.env.VITE_MCON_PATH || 'mcon';
  const cmd = Command.create('run-mcon', ['run', mconPath, ...args], { cwd });
  const output = await cmd.execute();
  return {
    stdout: output.stdout,
    stderr: output.stderr,
    code: output.code ?? 1,
  };
}
