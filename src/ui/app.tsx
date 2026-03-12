import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { loadState, refreshStatuses } from '../state';
import { AgentCard } from './agent-card';
import type { MCState } from '../types';

export function App({ repoRoot }: { repoRoot: string }) {
  const { exit } = useApp();
  const [state, setState] = useState<MCState | null>(null);

  useEffect(() => {
    function poll() {
      const s = loadState(repoRoot);
      if (s) {
        refreshStatuses(s);
        setState({ ...s });
      }
    }
    poll();
    const timer = setInterval(poll, 500);
    return () => clearInterval(timer);
  }, [repoRoot]);

  useInput((input) => {
    if (input === 'q') exit();
  });

  const agents = state?.agents || [];
  const running = agents.filter(a => a.status === 'running').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>miniconductor</Text>
        <Text> — {agents.length} agent{agents.length !== 1 ? 's' : ''}</Text>
        {running > 0 && <Text color="yellow"> ({running} running)</Text>}
        <Text dimColor>  [q to quit]</Text>
      </Box>

      {agents.length === 0 ? (
        <Text dimColor>No agents. Run `mcon spawn "task"` to start one.</Text>
      ) : (
        <Box flexDirection="row" flexWrap="wrap">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </Box>
      )}
    </Box>
  );
}
