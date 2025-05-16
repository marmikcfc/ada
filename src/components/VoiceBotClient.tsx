import React, { useEffect, useRef, useState } from 'react';
import { useVoiceBot } from '../hooks/useVoiceBot';

const VoiceBotClient: React.FC = () => {
  const { status, logs, audioStream, connect, disconnect } = useVoiceBot();
  const audioRef = useRef<HTMLAudioElement>(null);

  // LLM messages from WebSocket
  const [llmMessages, setLlmMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Set up WebSocket for LLM messages
    const ws = new WebSocket(
      window.location.protocol === 'https:'
        ? 'wss://' + window.location.host + '/ws/messages'
        : 'ws://' + window.location.host + '/ws/messages'
    );
    wsRef.current = ws;
    ws.onmessage = (event) => {
      setLlmMessages((prev) => [...prev, event.data]);
    };
    ws.onerror = (e) => {
      setLlmMessages((prev) => [...prev, '[WebSocket error]']);
    };
    ws.onclose = () => {
      setLlmMessages((prev) => [...prev, '[WebSocket closed]']);
    };
    return () => {
      ws.close();
    };
  }, []);

  // Set the audio element's srcObject to the bot's audio stream
  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
    }
    if (audioRef.current && !audioStream) {
      audioRef.current.srcObject = null;
    }
  }, [audioStream]);

  return (
    <div className="voicebot-container">
      <div className="status-bar">
        <span>Status: <b>{status}</b></span>
        <div className="controls">
          <button onClick={connect} disabled={status === 'Connected' || status === 'Connecting'}>Connect</button>
          <button onClick={disconnect} disabled={status !== 'Connected'}>Disconnect</button>
        </div>
      </div>
      <div className="main-content">
        <audio ref={audioRef} autoPlay className="bot-audio" />
        <div className="debug-panel">
          <h3>Debug Log</h3>
          <div className="debug-log" style={{height: 200, overflowY: 'auto', background: '#f8f8f8', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, padding: 8}}>
            {logs.map((log, idx) => <div key={idx}>{log}</div>)}
          </div>
        </div>
        {/* New LLM Messages panel */}
        <div className="llm-messages-panel" style={{marginTop: 16}}>
          <h3>LLM Messages</h3>
          <div className="llm-messages-log" style={{height: 200, overflowY: 'auto', background: '#eef6fa', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, padding: 8}}>
            {llmMessages.map((msg, idx) => <div key={idx}>{msg}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceBotClient; 