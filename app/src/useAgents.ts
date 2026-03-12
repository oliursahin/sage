import { useState, useEffect, useCallback } from 'react';
import type { MCState, Agent } from './types';
import { runMcon } from './shell';

export function useAgents(repoPath: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!repoPath) return;
    try {
      const result = await runMcon(['status', '--json'], repoPath);
      if (result.code === 0 && result.stdout.trim()) {
        const state: MCState = JSON.parse(result.stdout.trim());
        setAgents(state.agents);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, [refresh]);

  const spawn = useCallback(async (task: string) => {
    await runMcon(['spawn', task], repoPath);
    await refresh();
  }, [repoPath, refresh]);

  const kill = useCallback(async (id: string) => {
    await runMcon(['kill', id], repoPath);
    await refresh();
  }, [repoPath, refresh]);

  const merge = useCallback(async (id: string) => {
    const result = await runMcon(['merge', id], repoPath);
    await refresh();
    return result;
  }, [repoPath, refresh]);

  const clean = useCallback(async () => {
    await runMcon(['clean'], repoPath);
    await refresh();
  }, [repoPath, refresh]);

  return { agents, error, loading, spawn, kill, merge, clean, refresh };
}
