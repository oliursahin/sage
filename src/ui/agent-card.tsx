import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function StatusBadge({ status }: { status: Agent['status'] }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(timer);
  }, [status]);

  switch (status) {
    case 'running':
      return <Text color="yellow">{SPINNER_FRAMES[frame]} running</Text>;
    case 'done':
      return <Text color="green">✓ done</Text>;
    case 'failed':
      return <Text color="red">✗ failed</Text>;
    case 'killed':
      return <Text color="gray">■ killed</Text>;
  }
}

export function AgentCard({ agent }: { agent: Agent }) {
  const truncatedTask = agent.task.length > 36 ? agent.task.slice(0, 33) + '...' : agent.task;
  const truncatedMsg = agent.lastMessage.length > 36 ? agent.lastMessage.slice(0, 33) + '...' : agent.lastMessage;
  const cost = agent.costUsd > 0 ? `$${agent.costUsd.toFixed(2)}` : '-';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={
        agent.status === 'running' ? 'yellow' :
        agent.status === 'done' ? 'green' :
        agent.status === 'failed' ? 'red' : 'gray'
      }
      paddingX={1}
      width={42}
      marginRight={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text bold>{agent.id}</Text>
        <StatusBadge status={agent.status} />
      </Box>
      <Text>{truncatedTask}</Text>
      <Text dimColor>Branch: {agent.branch}</Text>
      <Text dimColor>Turns: {agent.turns}  Cost: {cost}</Text>
      <Text color="cyan">&gt; {truncatedMsg}</Text>
    </Box>
  );
}
