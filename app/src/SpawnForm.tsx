import React, { useState } from 'react';

interface Props {
  onSpawn: (task: string) => Promise<void>;
  repoPath: string;
  onRepoPathChange: (path: string) => void;
}

export function SpawnForm({ onSpawn, repoPath, onRepoPathChange }: Props) {
  const [task, setTask] = useState('');
  const [spawning, setSpawning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim() || spawning) return;
    setSpawning(true);
    try {
      await onSpawn(task.trim());
      setTask('');
    } finally {
      setSpawning(false);
    }
  };

  return (
    <form className="spawn-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input repo-input"
        placeholder="Repo path (e.g. ~/projects/myapp)"
        value={repoPath}
        onChange={(e) => onRepoPathChange(e.target.value)}
      />
      <div className="spawn-row">
        <input
          type="text"
          className="input task-input"
          placeholder="Task description..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          disabled={spawning}
        />
        <button type="submit" className="btn btn-spawn" disabled={spawning || !task.trim()}>
          {spawning ? 'Spawning...' : 'Spawn'}
        </button>
      </div>
    </form>
  );
}
