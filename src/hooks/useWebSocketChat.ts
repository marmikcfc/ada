import { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore: no type declarations for 'uuid'
import { v4 as uuidv4 } from 'uuid';

type StreamState = {
  id: string;
  text: string;
  ui: string;
  done: boolean;
};

export function useWebSocketChat(
  wsUrl: string,
  onTranscription?: (id: string, content: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [streams, setStreams] = useState<StreamState[]>([]);
  // Keep latest transcription callback in a ref to avoid effect redeps
  const onTranscriptionRef = useRef(onTranscription);
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => console.log('WebSocket connected for chat');
    ws.onmessage = (event) => {
      let data: any;
      try { data = JSON.parse(event.data); } catch { return; }
      const { type, id, content } = data;
      // Handle incoming user voice transcriptions
      if (type === 'user_transcription') {
        onTranscriptionRef.current?.(id, content || '');
        return;
      }
      // Handle incoming voice responses (already visualized UI)
      if (type === 'voice_response') {
        if (id && typeof content === 'string') {
          // Push a completed UI-only stream
          setStreams(prev => [...prev, { id, text: '', ui: content, done: true }]);
        }
        return;
      }
      setStreams(prev => {
        const idx = prev.findIndex(s => s.id === id);
        if (type === 'chat_token' && idx >= 0) {
          const s = prev[idx];
          const updated = { ...s, text: s.text + content };
          return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
        }
        if (type === 'c1_token' && idx >= 0) {
          const s = prev[idx];
          const updated = { ...s, ui: s.ui + content };
          return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
        }
        if (type === 'chat_done' && idx >= 0) {
          const s = prev[idx];
          const updated = { ...s, done: true };
          return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
        }
        return prev;
      });
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
    // Cleanup: only close if already OPEN to avoid closing during CONNECTING (StrictMode mounts)
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [wsUrl]);

  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const id = uuidv4();
    // initialize new stream slot
    setStreams(prev => [...prev, { id, text: '', ui: '', done: false }]);
    ws.send(JSON.stringify({ type: 'chat_request', id, content: text }));
    return id;
  }, []);

  // Allow manual UI updates (e.g. from C1Component partial edits)
  const updateUI = useCallback((id: string, ui: string) => {
    setStreams(prev => prev.map(s => s.id === id ? { ...s, ui } : s));
  }, []);

  return { streams, sendChat, updateUI };
} 