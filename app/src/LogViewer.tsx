import React, { useState, useEffect, useRef } from 'react';
import type { Agent } from './types';
import { runMcon } from './shell';

interface Props {
  agent: Agent;
  repoPath: string;
  onClose: () => void;
}

interface LogEntry {
  type: string;
  text?: string;
  tool?: string;
}

export function LogViewer({ agent, repoPath, onClose }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLog() {
      try {
        const result = await runMcon(['log', agent.id, '--json'], repoPath);
        if (cancelled || result.code !== 0) return;
        const events = JSON.parse(result.stdout.trim() || '[]');
        const parsed: LogEntry[] = [];

        for (const event of events) {
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                parsed.push({ type: 'text', text: block.text });
              }
              if (block.type === 'tool_use') {
                parsed.push({ type: 'tool', tool: block.name });
              }
            }
          }
          if (event.type === 'result') {
            parsed.push({
              type: 'result',
              text: `${event.is_error ? 'FAILED' : 'SUCCESS'} | Turns: ${event.num_turns || '?'} | Cost: $${event.cost_usd?.toFixed(2) || '?'}`,
            });
          }
        }
        setEntries(parsed);
      } catch {}
    }

    fetchLog();
    const interval = setInterval(fetchLog, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [agent.id, repoPath]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="log-viewer">
      <div className="log-header">
        <span className="log-title">Log: {agent.id} — {agent.task}</span>
        <button className="btn btn-close" onClick={onClose}>✕</button>
      </div>
      <div className="log-content" ref={containerRef}>
        {entries.length === 0 && <div className="log-empty">No output yet...</div>}
        {entries.map((entry, i) => (
          <div key={i} className={`log-entry log-${entry.type}`}>
            {entry.type === 'tool' ? (
              <span className="log-tool">[tool: {entry.tool}]</span>
            ) : entry.type === 'result' ? (
              <span className="log-result">--- {entry.text} ---</span>
            ) : (
              <span>{entry.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
