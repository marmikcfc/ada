# Genux SDK - Troubleshooting Guide

Common issues and solutions when working with Genux SDK.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Voice/Audio Problems](#voiceaudio-problems)
- [UI and Styling Issues](#ui-and-styling-issues)
- [Performance Issues](#performance-issues)
- [Integration Problems](#integration-problems)
- [Browser Compatibility](#browser-compatibility)
- [Development Setup](#development-setup)

---

## Connection Issues

### WebSocket Connection Fails

**Problem:** Chat messages not sending, connection state shows 'error' or 'disconnected'

**Solutions:**

1. **Check WebSocket URL format:**
   ```tsx
   // ✅ Correct
   websocketURL="wss://api.example.com/ws/messages"
   
   // ❌ Incorrect
   websocketURL="https://api.example.com/ws/messages" // Wrong protocol
   websocketURL="api.example.com/ws/messages" // Missing protocol
   ```

2. **Verify CORS settings on your backend:**
   ```javascript
   // Express.js example
   app.use(cors({
     origin: ['http://localhost:3000', 'https://yourapp.com'],
     credentials: true
   }));
   ```

3. **Check network/firewall restrictions:**
   ```bash
   # Test WebSocket connection manually
   curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
        -H "Sec-WebSocket-Version: 13" \
        https://your-api.com/ws/messages
   ```

4. **Debug connection state:**
   ```tsx
   const client = useGenuxClient({
     webrtcURL: '/api/offer',
     websocketURL: 'wss://api.example.com/ws/messages',
   });
   
   useEffect(() => {
     console.log('Connection state:', client.connectionState);
   }, [client.connectionState]);
   ```

### WebSocket Proxy Issues (Vite)

**Problem:** WebSocket connections to `/ws/messages` fail in local development.

**Solutions:**

1. **Configure your dev server to proxy** WebSocket paths in `vite.config.ts`:
   ```js
   // vite.config.ts
   import { defineConfig } from 'vite';
   
   export default defineConfig({
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
         '/ws': {
           target: 'ws://localhost:8000',
           ws: true,
         },
       },
     },
   });
   ```

2. **Use relative URLs** in your application when creating the `Genux` component:
   ```tsx
   <Genux
     webrtcURL="/api/offer"
     websocketURL="/ws/messages"
     // ...other props
   />
   ```

### WebRTC Connection Fails

**Problem:** Voice features not working, voice state shows 'error'

**Solutions:**

1. **Ensure HTTPS/WSS in production:**
   ```tsx
   // WebRTC requires secure contexts (HTTPS) in production
   const webrtcURL = process.env.NODE_ENV === 'development' 
     ? 'http://localhost:8000/api/offer'
     : 'https://api.example.com/api/offer';
   ```

2. **Check ICE servers configuration:**
   ```tsx
   // If you need custom STUN/TURN servers
   const customClient = new ConnectionService({
     webrtcURL: '/api/offer',
     websocketURL: 'wss://api.example.com/ws/messages',
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       {
         urls: 'turn:your-turn-server.com:3478',
         username: 'user',
         credential: 'pass'
       }
     ]
   });
   ```

3. **Test offer/answer endpoint:**
   ```bash
   curl -X POST https://api.example.com/api/offer \
        -H "Content-Type: application/json" \
        -d '{"sdp": "test", "type": "offer"}'
   ```

---

## Voice/Audio Problems

### Microphone Permission Denied

**Problem:** User gets permission denied error when trying to start voice

**Solutions:**

1. **Handle permission gracefully:**
   ```tsx
   const handleStartVoice = async () => {
     try {
       await client.startVoice();
     } catch (error) {
       if (error.name === 'NotAllowedError') {
         setError('Microphone permission denied. Please allow mic access and try again.');
       } else if (error.name === 'NotFoundError') {
         setError('No microphone found. Please connect a microphone.');
       }
     }
   };
   ```

2. **Add user-friendly permission prompt:**
   ```tsx
   function VoicePermissionPrompt() {
     return (
       <div className="permission-prompt">
         <h3>Voice Features Need Microphone Access</h3>
         <p>To use voice chat, please:</p>
         <ol>
           <li>Click the microphone icon in your browser's address bar</li>
           <li>Select "Allow" to grant microphone access</li>
           <li>Try starting voice chat again</li>
         </ol>
       </div>
     );
   }
   ```

3. **Provide fallback options:**
   ```tsx
   function VoiceInterface() {
     const [hasVoicePermission, setHasVoicePermission] = useState(null);
     
     useEffect(() => {
       navigator.mediaDevices.getUserMedia({ audio: true })
         .then(() => setHasVoicePermission(true))
         .catch(() => setHasVoicePermission(false));
     }, []);
     
     if (hasVoicePermission === false) {
       return <TextOnlyInterface />;
     }
     
     return <VoiceEnabledInterface />;
   }
   ```

### No Audio Playback

**Problem:** Voice responses not playing audio

**Solutions:**

1. **Check audio element setup:**
   ```tsx
   const audioRef = useRef<HTMLAudioElement>(null);
   
   useEffect(() => {
     if (audioRef.current && client.audioStream) {
       audioRef.current.srcObject = client.audioStream;
       // Ensure autoplay is enabled
       audioRef.current.play().catch(console.error);
     }
   }, [client.audioStream]);
   
   return <audio ref={audioRef} autoPlay style={{ display: 'none' }} />;
   ```

2. **Handle browser autoplay policies:**
   ```tsx
   const [audioEnabled, setAudioEnabled] = useState(false);
   
   const enableAudio = async () => {
     try {
       await audioRef.current?.play();
       setAudioEnabled(true);
     } catch (error) {
       console.log('Autoplay prevented, user interaction required');
     }
   };
   
   if (!audioEnabled) {
     return (
       <button onClick={enableAudio}>
         Click to enable audio
       </button>
     );
   }
   ```

### Poor Audio Quality

**Problem:** Choppy or low-quality audio

**Solutions:**

1. **Check network conditions:**
   ```tsx
   useEffect(() => {
     const connection = (navigator as any).connection;
     if (connection) {
       console.log('Network type:', connection.effectiveType);
       console.log('Downlink:', connection.downlink);
     }
   }, []);
   ```

2. **Adjust audio constraints:**
   ```tsx
   const audioConstraints = {
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
       sampleRate: 44100
     }
   };
   ```

---

## UI and Styling Issues

### Widget Not Visible

**Problem:** Genux component doesn't appear on the page

**Solutions:**

1. **Check z-index conflicts:**
   ```css
   /* Ensure Genux components appear above other elements */
   .genux-bubble-widget {
     z-index: 9999 !important;
   }
   
   .genux-chat-window {
     z-index: 10000 !important;
   }
   ```

2. **Verify container positioning:**
   ```tsx
   // Make sure parent container allows fixed positioning
   <div style={{ position: 'relative', height: '100vh' }}>
     <Genux {...props} />
   </div>
   ```

3. **Debug visibility:**
   ```tsx
   <Genux
     {...props}
     style={{ 
       border: '2px solid red', // Temporary debug border
       backgroundColor: 'yellow' // Temporary debug background
     }}
   />
   ```

### Theme Not Applied

**Problem:** Custom theme colors/styles not showing

**Solutions:**

1. **Ensure theme is passed correctly:**
   ```tsx
   import { createTheme } from 'genux-sdk';
   
   const myTheme = createTheme({
     colors: { primary: '#ff0000' }
   });
   
   <Genux
     {...props}
     options={{ theme: myTheme }} // ✅ Correct
     theme={myTheme} // ❌ Wrong prop name
   />
   ```

2. **Check CSS specificity:**
   ```tsx
   // Use CSS custom properties for better control
   const cssVars = themeToCssVars(myTheme);
   
   useEffect(() => {
     Object.entries(cssVars).forEach(([key, value]) => {
       document.documentElement.style.setProperty(key, value);
     });
   }, [cssVars]);
   ```

3. **Debug theme application:**
   ```tsx
   useEffect(() => {
     console.log('Applied theme:', myTheme);
   }, [myTheme]);
   ```

### Responsive Issues

**Problem:** Widget doesn't work well on mobile devices

**Solutions:**

1. **Add responsive breakpoints:**
   ```tsx
   const useScreenSize = () => {
     const [isMobile, setIsMobile] = useState(false);
     
     useEffect(() => {
       const checkScreenSize = () => {
         setIsMobile(window.innerWidth < 768);
       };
       
       checkScreenSize();
       window.addEventListener('resize', checkScreenSize);
       return () => window.removeEventListener('resize', checkScreenSize);
     }, []);
     
     return { isMobile };
   };
   
   function ResponsiveGenux() {
     const { isMobile } = useScreenSize();
     
     return (
       <Genux
         {...props}
         bubbleEnabled={!isMobile} // Full screen on mobile
         options={{
           theme: createTheme({
             spacing: isMobile ? 
               { md: '0.5rem', lg: '1rem' } : 
               { md: '1rem', lg: '1.5rem' }
           })
         }}
       />
     );
   }
   ```

2. **Handle touch interactions:**
   ```css
   .genux-bubble-widget {
     touch-action: manipulation; /* Prevent zoom on double-tap */
   }
   
   @media (max-width: 768px) {
     .genux-chat-window {
       width: 100vw !important;
       height: 100vh !important;
       bottom: 0 !important;
       right: 0 !important;
     }
   }
   ```

---

## Performance Issues

### Bundle Size Too Large

**Problem:** Genux SDK adds too much to your bundle size

**Solutions:**

1. **Use dynamic imports:**
   ```tsx
   const GenuxLazy = React.lazy(() => import('genux-sdk').then(module => ({
     default: module.Genux
   })));
   
   function App() {
     return (
       <Suspense fallback={<div>Loading chat...</div>}>
         <GenuxLazy {...props} />
       </Suspense>
     );
   }
   ```

2. **Import only what you need:**
   ```tsx
   // ✅ Import specific components
   import { useGenuxClient } from 'genux-sdk';
   
   // ❌ Don't import everything
   import * as Genux from 'genux-sdk';
   ```

3. **Check bundle analyzer:**
   ```bash
   # Using webpack-bundle-analyzer
   npm install --save-dev webpack-bundle-analyzer
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

### Memory Leaks

**Problem:** Page becomes slow after using Genux for extended periods

**Solutions:**

1. **Ensure proper cleanup:**
   ```tsx
   useEffect(() => {
     const client = new ConnectionService({...});
     
     return () => {
       client.disconnect();
       client.removeAllListeners();
     };
   }, []);
   ```

2. **Monitor memory usage:**
   ```tsx
   useEffect(() => {
     const interval = setInterval(() => {
       if (performance.memory) {
         console.log('Memory usage:', {
           used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
           total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
           limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
         });
       }
     }, 10000);
     
     return () => clearInterval(interval);
   }, []);
   ```

---

## Integration Problems

### React Version Conflicts

**Problem:** Genux SDK conflicts with your React version

**Solutions:**

1. **Check peer dependencies:**
   ```bash
   npm ls react react-dom
   ```

2. **Use compatible versions:**
   ```json
   {
     "dependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0",
       "genux-sdk": "^0.1.0"
     }
   }
   ```

3. **Configure webpack aliases if needed:**
   ```javascript
   // webpack.config.js
   module.exports = {
     resolve: {
       alias: {
         react: path.resolve('./node_modules/react'),
         'react-dom': path.resolve('./node_modules/react-dom')
       }
     }
   };
   ```

### TypeScript Errors

**Problem:** TypeScript compilation errors with Genux SDK

**Solutions:**

1. **Install type definitions:**
   ```bash
   npm install --save-dev @types/react @types/react-dom
   ```

2. **Update tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "allowSyntheticDefaultImports": true,
       "esModuleInterop": true,
       "skipLibCheck": true
     }
   }
   ```

3. **Create custom type declarations if needed:**
   ```typescript
   // types/genux.d.ts
   declare module 'genux-sdk' {
     export interface GenuxProps {
       webrtcURL: string;
       websocketURL: string;
       // ... other props
     }
     
     export const Genux: React.FC<GenuxProps>;
   }
   ```

---

## Browser Compatibility

### Safari Issues

**Problem:** Genux SDK doesn't work properly in Safari

**Solutions:**

1. **Check WebRTC support:**
   ```tsx
   const checkWebRTCSupport = () => {
     return !!(window.RTCPeerConnection || 
               window.webkitRTCPeerConnection || 
               window.mozRTCPeerConnection);
   };
   
   if (!checkWebRTCSupport()) {
     return <div>WebRTC not supported in this browser</div>;
   }
   ```

2. **Handle Safari-specific permissions:**
   ```tsx
   const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
   
   if (isSafari) {
     // Safari requires user interaction before accessing media
     return (
       <button onClick={handleEnableVoice}>
         Enable Voice Features
       </button>
     );
   }
   ```

### Mobile Browser Issues

**Problem:** Features don't work on mobile browsers

**Solutions:**

1. **Check mobile support:**
   ```tsx
   const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
   
   if (isMobile) {
     // Provide mobile-specific UI or warnings
   }
   ```

2. **Handle touch events:**
   ```tsx
   const handleTouchStart = (e: TouchEvent) => {
     // Handle touch interactions
   };
   
   useEffect(() => {
     document.addEventListener('touchstart', handleTouchStart);
     return () => document.removeEventListener('touchstart', handleTouchStart);
   }, []);
   ```

---

## Development Setup

### Hot Reload Issues

**Problem:** Changes to Genux configuration don't reflect during development

**Solutions:**

1. **Use key prop to force remount:**
   ```tsx
   const [configKey, setConfigKey] = useState(0);
   
   const updateConfig = () => {
     setConfigKey(prev => prev + 1);
   };
   
   <Genux
     key={configKey}
     {...props}
   />
   ```

2. **Clear connection cache:**
   ```tsx
   useEffect(() => {
     // Force new connection on config change
     if (process.env.NODE_ENV === 'development') {
       localStorage.removeItem('genux-connection-cache');
     }
   }, [webrtcURL, websocketURL]);
   ```

### CORS During Development

**Problem:** CORS errors when testing locally

**Solutions:**

1. **Configure development proxy:**
   ```json
   // package.json
   {
     "proxy": "http://localhost:8000"
   }
   ```

2. **Use development CORS headers:**
   ```javascript
   // Development server
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true
   }));
   ```

---

## Getting Help

If you're still experiencing issues:

1. **Check the console:** Look for error messages in browser dev tools
2. **Enable debug logging:** Set `localStorage.debug = 'genux:*'` in browser console
3. **Review network tab:** Check for failed requests in browser dev tools
4. **Test with minimal setup:** Try with a basic configuration first
5. **Check GitHub issues:** Search for similar problems
6. **Create a reproduction:** Make a minimal example that demonstrates the issue

### Debug Mode

Enable detailed logging to troubleshoot issues:

```tsx
// Enable debug mode
if (process.env.NODE_ENV === 'development') {
  localStorage.setItem('debug', 'genux:*');
}

// Or programmatically
import { ConnectionService } from 'genux-sdk';

const service = new ConnectionService({
  webrtcURL: '/api/offer',
  websocketURL: 'wss://api.example.com/ws/messages',
  debug: true, // Enable debug logging
});
```

---

For more help:
- [Getting Started Guide](./genux-sdk-getting-started.md)
- [API Reference](./genux-sdk-api-reference.md)
- [Customization Guide](./genux-sdk-customization.md)
- [Examples](./genux-sdk-examples.md) 