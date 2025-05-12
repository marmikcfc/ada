import React, { useEffect, useRef } from 'react';
import { useVoiceBot } from '../hooks/useVoiceBot';

const VoiceBotClient: React.FC = () => {
  const { status, logs, audioStream, connect, disconnect } = useVoiceBot();
  const audioRef = useRef<HTMLAudioElement>(null);

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
      </div>
    </div>
  );
};

export default VoiceBotClient; 