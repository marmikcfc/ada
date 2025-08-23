# GeUI SDK Backend Integration Guide

This guide explains how to integrate the GeUI SDK with a backend API for thread persistence and management.

## Overview

The GeUI SDK supports two modes of thread management:
1. **Local Storage** (default) - Threads and messages are stored in the browser's localStorage
2. **Backend Persistence** - Threads and messages are stored in a backend database via REST APIs

## Enabling Backend Persistence

To enable backend persistence, provide the `threadBackendConfig` prop to the GeUI component:

```typescript
import { GeUI } from 'geui-sdk';

function App() {
  return (
    <GeUI
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      enableThreadManagement={true}
      threadBackendConfig={{
        baseUrl: 'http://localhost:8000',  // Your backend API URL
        endpoints: {
          threads: '/api/threads/list',
          threadDetail: '/api/threads/{id}',
          create: '/api/threads/create',
          update: '/api/threads/{id}',
          delete: '/api/threads/{id}',
          messages: '/api/threads/{id}/messages',
          search: '/api/threads/search'
        },
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN'  // Optional auth headers
        },
        cache: {
          enabled: true,
          ttlMs: 30000  // Cache TTL in milliseconds
        },
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
          exponential: true
        }
      }}
    />
  );
}
```

## Using with the Hook

For headless usage, you can pass the backend config to the `useGeUIClient` hook:

```typescript
import { useGeUIClient } from 'geui-sdk';

function MyCustomChat() {
  const client = useGeUIClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/messages',
    enableThreads: true,
    threadBackendConfig: {
      baseUrl: 'http://localhost:8000',
      // ... other config
    }
  });

  // Thread management functions will now use the backend
  const handleCreateThread = async () => {
    const thread = await client.createThread('New Conversation');
    console.log('Created thread:', thread);
  };

  const handleLoadThreads = async () => {
    // This will fetch from backend API
    const threads = client.threads;
    console.log('Loaded threads:', threads);
  };

  return (
    // Your custom UI
  );
}
```

## Backend API Requirements

Your backend must implement the following REST endpoints:

### 1. List Threads
```
GET /api/threads/list?limit=20&offset=0&connection_id=xxx
```

Response:
```json
{
  "threads": [
    {
      "thread_id": "thread-123",
      "title": "Conversation Title",
      "created_at": "2025-08-16T10:00:00Z",
      "last_activity": "2025-08-16T10:30:00Z",
      "message_count": 5,
      "last_message": "Last message preview...",
      "archived": false,
      "tags": ["tag1", "tag2"]
    }
  ],
  "total_count": 10,
  "has_more": false
}
```

### 2. Get Thread Details
```
GET /api/threads/{thread_id}?message_limit=50
```

Response:
```json
{
  "thread_id": "thread-123",
  "title": "Conversation Title",
  "created_at": "2025-08-16T10:00:00Z",
  "last_activity": "2025-08-16T10:30:00Z",
  "message_count": 5,
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "message_id": "msg-1",
      "timestamp": 1755330000,
      "content_type": "text"
    },
    {
      "role": "assistant",
      "content": "Hi there!",
      "message_id": "msg-2",
      "timestamp": 1755330001,
      "content_type": "text"
    }
  ]
}
```

### 3. Create Thread
```
POST /api/threads/create
```

Request:
```json
{
  "title": "New Conversation",
  "initial_message": "Hello, I need help with...",
  "connection_id": "conn-123",
  "session_id": "session-456",
  "tags": ["support", "technical"]
}
```

### 4. Update Thread
```
PUT /api/threads/{thread_id}
```

Request:
```json
{
  "title": "Updated Title",
  "archived": false,
  "tags": ["updated", "tags"]
}
```

### 5. Delete Thread
```
DELETE /api/threads/{thread_id}
```

### 6. Get Thread Messages
```
GET /api/threads/{thread_id}/messages?limit=50&offset=0
```

Response:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Message content",
      "message_id": "msg-1",
      "timestamp": 1755330000,
      "content_type": "text"
    }
  ],
  "total_count": 100,
  "has_more": true,
  "next_offset": 50
}
```

### 7. Search Threads
```
GET /api/threads/search?query=keyword&connection_id=xxx
```

Response:
```json
{
  "threads": [
    {
      "thread_id": "thread-123",
      "title": "Matching Thread",
      "last_message": "...matching content...",
      // ... other thread fields
    }
  ],
  "total_count": 5,
  "has_more": false
}
```

## Configuration Options

### ThreadBackendConfig

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `baseUrl` | string | Base URL of your backend API | Required |
| `headers` | object | Additional headers for API requests | `{}` |
| `endpoints` | object | Custom endpoint paths | See defaults above |
| `cache.enabled` | boolean | Enable response caching | `false` |
| `cache.ttlMs` | number | Cache TTL in milliseconds | `30000` |
| `retry.maxAttempts` | number | Max retry attempts for failed requests | `3` |
| `retry.backoffMs` | number | Base backoff delay in ms | `1000` |
| `retry.exponential` | boolean | Use exponential backoff | `true` |

## Migration from localStorage

If you have existing threads in localStorage and want to migrate to backend persistence:

1. Enable both localStorage and backend:
```typescript
const config = {
  enableThreads: true,
  threadOptions: {
    enablePersistence: true,  // Keep localStorage enabled
    storageKey: 'geui-threads'
  },
  threadBackendConfig: {
    baseUrl: 'http://localhost:8000'
    // ... other config
  }
};
```

2. Export existing threads from localStorage:
```typescript
const existingThreads = localStorage.getItem('geui-threads');
const parsed = JSON.parse(existingThreads);
```

3. Import to backend using the import endpoint:
```typescript
const backendService = new ThreadBackendService(config.threadBackendConfig);
await backendService.importThreads(parsed.threads);
```

4. Disable localStorage after migration:
```typescript
config.threadOptions.enablePersistence = false;
```

## Performance Considerations

1. **Caching**: Enable caching to reduce API calls for frequently accessed threads
2. **Pagination**: Use pagination when loading thread messages to avoid loading large datasets
3. **Connection Pooling**: The SDK reuses connections when possible
4. **Retry Logic**: Failed requests are automatically retried with exponential backoff

## Error Handling

The SDK handles backend errors gracefully:

- **Network Errors**: Automatically retried with exponential backoff
- **4xx Errors**: Not retried, error is logged to console
- **5xx Errors**: Retried up to `maxAttempts` times
- **Timeout**: Requests timeout after 30 seconds by default

You can handle errors in your application:

```typescript
try {
  const thread = await client.createThread('New Thread');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.statusCode, error.message);
    // Fall back to localStorage or show error to user
  }
}
```

## Security

1. **Authentication**: Include auth tokens in the `headers` configuration
2. **CORS**: Ensure your backend allows requests from your frontend domain
3. **Rate Limiting**: The SDK respects rate limit headers from your backend
4. **Data Validation**: All responses are validated before processing

## Example Backend (Python/FastAPI)

See the `backend/app/routes/threads.py` file for a complete FastAPI implementation of the required endpoints.

## Troubleshooting

### Threads not loading
- Check network tab for API calls
- Verify `baseUrl` is correct
- Check CORS configuration
- Verify authentication headers

### Messages not persisting
- Ensure thread has a valid `thread_id`
- Check if messages endpoint is returning correct format
- Verify connection_id is being passed correctly

### Cache issues
- Clear cache by calling `threadBackendService.invalidateCache()`
- Disable cache temporarily with `cache.enabled: false`
- Check cache TTL settings

## Support

For issues or questions, please open an issue on the GeUI SDK repository.