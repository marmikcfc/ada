import { useCallback, useEffect, useRef, useState } from 'react';
// @ts-ignore
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';
// @ts-ignore
import { RTVIClient, RTVIClientOptions, Participant, Transport } from '@pipecat-ai/client-js';




export type VoiceBotStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error';

interface Transcript {
  text: string;
  final?: boolean;
}

interface UseVoiceBotResult {
  status: VoiceBotStatus;
  logs: string[];
  audioStream: MediaStream | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useVoiceBot(): UseVoiceBotResult {
  const [status, setStatus] = useState<VoiceBotStatus>('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Keep refs for transport and client
  const transportRef = useRef<SmallWebRTCTransport | null>(null);
  const clientRef = useRef<RTVIClient | null>(null);

  // Helper to log messages
  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Connect to the voice bot
  const connect = useCallback(async () => {
    if (status === 'Connected' || status === 'Connecting') return;
    setStatus('Connecting');
    log('Connecting...');
    try {
      const transport = new SmallWebRTCTransport();
      const clientOptions: RTVIClientOptions = {
        params: {
          baseUrl: '/api/offer',
        },
        transport: transport as Transport,
        enableMic: true,
        enableCam: false,
        callbacks: {
          onTransportStateChanged: (state: string) => log(`Transport state: ${state}`),
          onConnected: () => {
            setStatus('Connected');
            log('Connected');
          },
          onBotReady: () => log('Bot is ready.'),
          onDisconnected: () => {
            setStatus('Disconnected');
            log('Disconnected');
            setAudioStream(null);
          },
          onUserStartedSpeaking: () => log('User started speaking.'),
          onUserStoppedSpeaking: () => log('User stopped speaking.'),
          onBotStartedSpeaking: () => log('Bot started speaking.'),
          onBotStoppedSpeaking: () => log('Bot stopped speaking.'),
          onUserTranscript: (transcript: Transcript) => {
            if (transcript.final) log(`User transcript: ${transcript.text}`);
          },
          onBotTranscript: (transcript: Transcript) => log(`Bot transcript: ${transcript.text}`),
          onTrackStarted: (track: MediaStreamTrack, participant?: Participant) => {
            if (participant?.local) return;
            if (track.kind === 'audio') {
              setAudioStream(new MediaStream([track]));
              log('Received bot audio track.');
            }
          },
          onServerMessage: (msg: string) => log(`Server message: ${msg}`),
        },
        customConnectHandler: () => Promise.resolve(),
      };
      const client = new RTVIClient(clientOptions);
      transportRef.current = transport;
      clientRef.current = client;
      await client.connect();
    } catch (err: any) {
      setStatus('Error');
      log(`Error: ${err?.message || err}`);
    }
  }, [log, status]);

  // Disconnect from the voice bot
  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      setStatus('Disconnected');
      log('Disconnected');
      setAudioStream(null);
    }
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return {
    status,
    logs,
    audioStream,
    connect,
    disconnect,
  };
} 