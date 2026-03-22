import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from './ui/Button';
import { Loader2 } from 'lucide-react';

interface SshTerminalProps {
  hypervisorId: number;
  vmId: string;
  onClose: () => void;
}

export function SshTerminal({ hypervisorId, vmId, onClose }: SshTerminalProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pendingDataRef = useRef<string[]>([]);

  const [phase, setPhase] = useState<'login' | 'connecting' | 'connected' | 'error'>('login');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Callback ref: fires immediately when the DOM node is attached
  const termCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || terminalRef.current) return;

    const ws = wsRef.current;
    if (!ws) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#22d3ee',
        selectionBackground: '#334155',
        black: '#0f172a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(node);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Flush buffered data
    for (const data of pendingDataRef.current) {
      terminal.write(data);
    }
    pendingDataRef.current = [];

    // Fit after layout is complete
    setTimeout(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
      }
    }, 100);

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'data', data }));
      }
    });

    terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    terminal.focus();
  }, [phase]);

  function connect() {
    if (!username || !password) return;
    setPhase('connecting');
    setError('');
    pendingDataRef.current = [];

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/ssh?hypervisorId=${hypervisorId}&vmId=${vmId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', username, password }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'status') {
        if (msg.status === 'connected') {
          setPhase('connected');
        } else if (msg.status === 'error') {
          setError(msg.message || 'Errore di connessione');
          setPhase('error');
          ws.close();
        } else if (msg.status === 'disconnected') {
          terminalRef.current?.writeln('\r\n\x1b[31mConnessione chiusa.\x1b[0m');
        }
      } else if (msg.type === 'data') {
        if (terminalRef.current) {
          terminalRef.current.write(msg.data);
        } else {
          pendingDataRef.current.push(msg.data);
        }
      }
    };

    ws.onerror = () => {
      setError('Errore di connessione WebSocket');
      setPhase('error');
    };

    ws.onclose = () => {
      setPhase((prev) => {
        if (prev === 'connecting') return 'error';
        return prev;
      });
    };
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      terminalRef.current?.dispose();
    };
  }, []);

  if (phase === 'login' || phase === 'error') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm text-surface-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-surface-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={connect} disabled={!username || !password}>
            Connetti
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'connecting') {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-surface-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Connessione SSH in corso...</span>
      </div>
    );
  }

  return (
    <div
      ref={termCallbackRef}
      className="w-full h-[300px] sm:h-[400px] lg:h-[450px] rounded-lg overflow-hidden"
    />
  );
}
