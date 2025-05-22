import React, { useEffect, useRef, useState } from 'react';
import { useVoiceBot } from '../hooks/useVoiceBot';

const VoiceBotClient: React.FC = () => {
  const { status, logs, audioStream, connect, disconnect } = useVoiceBot();
  const audioRef = useRef<HTMLAudioElement>(null);

  // LLM messages from WebSocket
  const [llmMessages, setLlmMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    console.log('Attempting to set up WebSocket for LLM messages...');
    // Set up WebSocket for LLM messages
    const wsUrl = 
      window.location.protocol === 'https:'
        ? 'wss://' + window.location.host + '/ws/messages'
        : 'ws://' + window.location.host + '/ws/messages';
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Frontend WebSocket: onopen event fired.');
      setLlmMessages((prev) => [...prev, '[WebSocket connected!]']);
    };

    ws.onmessage = (event) => {
      console.log('Frontend WebSocket: onmessage event fired.', event.data);
      setLlmMessages((prev) => [...prev, event.data]);
    };

    ws.onerror = (event) => {
      console.error('Frontend WebSocket: onerror event fired:', JSON.stringify(event));
      setLlmMessages((prev) => [...prev, '[WebSocket error]']);
    };

    ws.onclose = (event) => {
      console.log('Frontend WebSocket: onclose event fired:', event);
      setLlmMessages((prev) => [
        ...prev,
        `[WebSocket closed: code=${event.code}, reason=${event.reason || 'N/A'}, clean=${event.wasClean}]`,
      ]);
    };

    return () => {
      console.log('Frontend WebSocket: useEffect cleanup - closing WebSocket.');
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED && wsRef.current.readyState !== WebSocket.CLOSING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, []); // Empty dependency array, runs once on mount

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