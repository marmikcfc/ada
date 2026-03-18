# Voice Idle Timeout Test Plan

## Overview
This document outlines the test plan for the voice idle timeout feature that automatically disconnects voice connections after a configurable period of inactivity.

## Test Configuration
Default settings (from environment variables):
- `VOICE_IDLE_TIMEOUT`: 60 seconds (time before disconnect)
- `VOICE_IDLE_WARNING_TIME`: 10 seconds (warning period before disconnect)
- `VOICE_IDLE_CHECK_INTERVAL`: 5 seconds (how often to check for idle connections)

## Test Scenarios

### 1. Basic Idle Timeout Test
**Steps:**
1. Start the backend server with default settings
2. Connect via WebSocket and establish voice connection
3. Speak to trigger user speech tracking
4. Wait for bot response to complete
5. Do not speak for 50 seconds
6. Verify warning message is received at ~50 seconds
7. Continue to not speak for another 10 seconds
8. Verify voice connection is disconnected at ~60 seconds

**Expected Results:**
- Warning message: "Voice connection will disconnect in 10 seconds due to inactivity"
- Disconnect message: "Voice connection disconnected due to inactivity"
- Voice state changes to 'disconnected'

### 2. User Activity Resets Timer
**Steps:**
1. Establish voice connection
2. Let bot finish speaking
3. Wait 45 seconds
4. Speak before warning appears
5. Verify timer is reset
6. Wait another 60 seconds without speaking

**Expected Results:**
- No warning at 50 seconds after initial bot response
- Warning appears 50 seconds after user's last speech
- Disconnect occurs 60 seconds after user's last speech

### 3. Configuration Test
**Steps:**
1. Set environment variables:
   - `VOICE_IDLE_TIMEOUT=30`
   - `VOICE_IDLE_WARNING_TIME=5`
2. Restart backend
3. Connect voice and let it idle
4. Verify warning at 25 seconds
5. Verify disconnect at 30 seconds

**Expected Results:**
- Timing follows configured values

### 4. Disabled Timeout Test
**Steps:**
1. Set `VOICE_IDLE_TIMEOUT=0`
2. Restart backend
3. Connect voice and let it idle for 2+ minutes

**Expected Results:**
- No warnings or disconnects
- Voice remains connected indefinitely

### 5. Frontend Callback Test
**Steps:**
1. Use the SDK with idle callbacks:
```javascript
const client = useGeUIClient({
  webrtcURL: '/api/offer',
  websocketURL: '/ws/messages',
  voiceIdleTimeout: {
    onIdleWarning: (secondsRemaining) => {
      console.log(`Warning: ${secondsRemaining}s until disconnect`);
    },
    onIdleDisconnect: () => {
      console.log('Voice disconnected due to idle');
    }
  }
});
```
2. Let voice connection idle
3. Verify callbacks are triggered

**Expected Results:**
- `onIdleWarning` called with correct seconds remaining
- `onIdleDisconnect` called when disconnected

### 6. Multiple Connection Test
**Steps:**
1. Open 3 browser tabs with voice connections
2. Let tab 1 idle completely (disconnect)
3. Keep tab 2 active by speaking every 30 seconds
4. Let tab 3 reach warning but speak before disconnect

**Expected Results:**
- Each connection tracked independently
- Only idle connections receive warnings/disconnects
- Active connections remain connected

## Debug Commands

### Check Voice Idle Status
```bash
# Get connection metrics including voice status
curl http://localhost:8000/api/connections/metrics
```

### Monitor Logs
```bash
# Watch for idle timeout events
tail -f backend/logs.out | grep -E "(idle|speech_time|VoiceIdleMonitor)"
```

### Test Environment Variables
```bash
# Quick test with short timeouts
VOICE_IDLE_TIMEOUT=20 VOICE_IDLE_WARNING_TIME=5 python backend/main.py
```

## Implementation Files
- Backend configuration: `backend/app/config.py`
- Voice idle monitor: `backend/app/voice_idle_monitor.py`
- Connection manager: `backend/app/connection_manager.py`
- Voice agent: `backend/agent/voice_based_interaction_agent.py`
- Frontend types: `packages/geui-sdk/src/types/index.ts`
- Connection service: `packages/geui-sdk/src/core/ConnectionService.ts`
- React hook: `packages/geui-sdk/src/hooks/useGeUIClient.ts`