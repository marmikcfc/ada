import React, { useEffect, useRef, useState } from 'react';
import { useVoiceBot } from '../hooks/useVoiceBot';
import '@crayonai/react-ui/styles/index.css';

const VoiceBotClient: React.FC = () => {
  const { status, logs, audioStream, connect, disconnect } = useVoiceBot();
  const audioRef = useRef<HTMLAudioElement>(null);

  // LLM messages from WebSocket (raw string log)
  const [llmMessages, setLlmMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Effect for WebSocket
  useEffect(() => {
    console.log('Attempting to set up WebSocket for LLM messages...');
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
      
      // Add connection message to current thread
      // const connectionMessage: Message = {
      //   id: crypto.randomUUID(),
      //   role: 'assistant',
      //   content: message,
      // };
    };

    ws.onmessage = (event) => {
      console.log('Frontend WebSocket: onmessage event fired.', event.data);
      setLlmMessages((prev) => [...prev, event.data as string]);

    };

    ws.onerror = (event) => {
      console.error('Frontend WebSocket: onerror event fired:', JSON.stringify(event));
      setLlmMessages((prev) => [...prev, '[WebSocket error]']);
    };

    ws.onclose = (event) => {
      console.log('Frontend WebSocket: onclose event fired:', event);
      const closeMessageStr = `[WebSocket closed: code=${event.code}, reason=${event.reason || 'N/A'}, clean=${event.wasClean}]`;
      setLlmMessages((prev) => [ ...prev, closeMessageStr ]);
    };

    return () => {
      console.log('Frontend WebSocket: useEffect cleanup - closing WebSocket.');
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED && wsRef.current.readyState !== WebSocket.CLOSING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>

      </div>
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
          <div className="debug-log" style={{height: 100, overflowY: 'auto', background: '#f8f8f8', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, padding: 8}}>
            {logs.map((log, idx) => <div key={idx}>{log}</div>)}
          </div>
        </div>
        <div className="llm-messages-panel" style={{marginTop: 16}}>
          <h3>LLM Messages (Raw)</h3>
          <div className="llm-messages-log" style={{height: 100, overflowY: 'auto', background: '#eef6fa', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, padding: 8}}>
            {llmMessages.map((msg, idx) => <div key={idx}>{msg}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceBotClient; 