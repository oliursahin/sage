import React, { useState } from 'react';
import { useAgents } from './useAgents';
import { AgentCard } from './AgentCard';
import { SpawnForm } from './SpawnForm';
import { LogViewer } from './LogViewer';

export function App() {
  const [repoPath, setRepoPath] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { agents, error, spawn, kill, merge, clean } = useAgents(repoPath);

  const selectedAgent = agents.find(a => a.id === selectedId) || null;
  const running = agents.filter(a => a.status === 'running').length;
  const total = agents.length;

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">miniconductor</h1>
        <div className="header-stats">
          {total > 0 && <span>{running} running / {total} total</span>}
          {agents.some(a => a.status !== 'running') && (
            <button className="btn btn-clean" onClick={clean}>Clean</button>
          )}
        </div>
      </header>

      <SpawnForm onSpawn={spawn} repoPath={repoPath} onRepoPathChange={setRepoPath} />

      {error && <div className="error">{error}</div>}

      <div className="main-area">
        <div className="agent-grid">
          {agents.length === 0 ? (
            <div className="empty-state">
              No agents yet. Enter a repo path and spawn one above.
            </div>
          ) : (
            agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={agent.id === selectedId}
                onSelect={() => setSelectedId(agent.id === selectedId ? null : agent.id)}
                onKill={() => kill(agent.id)}
                onMerge={() => merge(agent.id)}
              />
            ))
          )}
        </div>

        {selectedAgent && (
          <LogViewer
            agent={selectedAgent}
            repoPath={repoPath}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
