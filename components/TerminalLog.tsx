import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white border border-lumina-700 rounded-md p-4 h-48 overflow-y-auto font-mono text-xs shadow-inner">
      <div className="flex items-center gap-2 text-lumina-dim mb-2 pb-2 border-b border-lumina-700">
        <span className="w-2 h-2 rounded-full bg-lumina-accent animate-pulse"></span>
        <span className="font-bold tracking-wider">SYSTEM_LOG</span>
      </div>
      <div ref={scrollRef} className="space-y-1.5">
        {logs.length === 0 && <span className="text-lumina-dim italic">Waiting for input...</span>}
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-lumina-dim shrink-0 opacity-70">[{log.timestamp}]</span>
            <span className="text-lumina-accent font-bold shrink-0">{log.system}:</span>
            <span className="text-lumina-text break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalLog;