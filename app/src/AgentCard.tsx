import React from 'react';
import type { Agent } from './types';

const STATUS_CONFIG = {
  running: { dot: '●', color: '#f59e0b', label: 'running' },
  done: { dot: '✓', color: '#22c55e', label: 'done' },
  failed: { dot: '✗', color: '#ef4444', label: 'failed' },
  killed: { dot: '■', color: '#6b7280', label: 'killed' },
} as const;

interface Props {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
  onKill: () => void;
  onMerge: () => void;
}

export function AgentCard({ agent, selected, onSelect, onKill, onMerge }: Props) {
  const status = STATUS_CONFIG[agent.status];
  const cost = agent.costUsd > 0 ? `$${agent.costUsd.toFixed(2)}` : '-';
  const truncTask = agent.task.length > 50 ? agent.task.slice(0, 47) + '...' : agent.task;
  const truncMsg = agent.lastMessage.length > 60 ? agent.lastMessage.slice(0, 57) + '...' : agent.lastMessage;

  return (
    <div
      className={`agent-card ${selected ? 'selected' : ''}`}
      style={{ borderColor: status.color }}
      onClick={onSelect}
    >
      <div className="card-header">
        <span className="agent-id">{agent.id}</span>
        <span className="status-badge" style={{ color: status.color }}>
          {status.dot} {status.label}
        </span>
      </div>
      <div className="card-task">{truncTask}</div>
      <div className="card-meta">
        <span>branch: {agent.branch}</span>
        <span>turns: {agent.turns} · cost: {cost}</span>
      </div>
      <div className="card-message">&gt; {truncMsg}</div>
      <div className="card-actions">
        {agent.status === 'running' && (
          <button className="btn btn-kill" onClick={(e) => { e.stopPropagation(); onKill(); }}>
            Kill
          </button>
        )}
        {agent.status === 'done' && (
          <button className="btn btn-merge" onClick={(e) => { e.stopPropagation(); onMerge(); }}>
            Merge
          </button>
        )}
      </div>
    </div>
  );
}
