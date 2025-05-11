# Memory MCP Server – Implementation Plan

## Overview
This document outlines the detailed implementation plan for a Memory Model Context Protocol (MCP) server. The Memory MCP server will provide persistent and transient memory operations (store, retrieve, update, delete, list) to autonomous agents via standardized MCP tool calls.

## Requirements
- Node.js (v14+)
- npm or yarn
- @modelcontextprotocol/create-server CLI
- @modelcontextprotocol/sdk/server (TypeScript SDK)
- TypeScript

## Architecture
- Use the MCP Server SDK for Node.js/TypeScript
- Scaffold project with `create-server`
- Register four main tools:
  1. `memory.set`    – store a key/value pair
  2. `memory.get`    – retrieve a value by key
  3. `memory.delete` – remove a key/value entry
  4. `memory.list`   – list all stored keys
- Default in-memory store implemented with a `Map<string, any>` (extensible to file or database)
- Use `StdioServerTransport` for stdio-based communication

## Implementation Steps

### 1. Scaffold Project
- Run: `npx @modelcontextprotocol/create-server memory`
- Change into directory: `cd memory`

### 2. Install Dependencies & Setup
- Install dependencies: `npm install`
- Add MCP SDK: `npm install --save @modelcontextprotocol/sdk`
- Initialize TypeScript: ensure `tsconfig.json` targets `src/` and outputs to `dist/`

### 3. Define Memory Store Module
- Create `src/memoryStore.ts`
- Implement `export class MemoryStore { private store = new Map<string, any>(); /* methods: set, get, delete, list */ }`

### 4. Implement Tool Specifications
- In `src/index.ts`:
  - Import `{ Server }` from `@modelcontextprotocol/sdk/server/index.js`
  - Import `{ StdioServerTransport }` from `@modelcontextprotocol/sdk/server/stdio.js`
  - Import `MemoryStore`
  - Instantiate server: `const server = new Server({ name: 'memory', version: '1.0.0' }, { capabilities: { tools: {}, resources: {} } });`
  - Instantiate `const store = new MemoryStore();`
  - Register tools with `server.addTool(new SyncToolSpecification(...))` for each of the four operations using correct schemas (e.g. Zod or JSON schemas)

### 5. Register and Run Server
- After tool registration, connect transport:
```ts
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Memory MCP Server running on stdio');
``` 
- Add proper error handling and exit codes

### 6. Build & Development Workflow
- One-time build: `npm run build`
- Watch mode during development: `npm run watch`
- Optional global link: `npm link`

### 7. Testing
- Write unit tests for `MemoryStore` methods
- Integration tests invoking tool requests via stdio
- Example: feed JSON messages on stdin and verify JSON responses on stdout

### 8. CI & Deployment
- Add GitHub Actions workflow:
  - Trigger on push/pull_request
  - Steps: checkout, install, build, test
- Prepare `package.json` for NPM publishing
- Publish under `@modelcontextprotocol/server-memory` or custom scope

### 9. Integration
- Update agent/client configuration (e.g., `mcpServers.memory`) to:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

## TODO List
- [ ] Scaffold Memory MCP server project
- [ ] Install MCP SDK and peer dependencies
- [ ] Configure `tsconfig.json` and project structure
- [ ] Implement `MemoryStore` class with CRUD methods
- [ ] Define and register tool schemas/specifications
- [ ] Wire up tool handlers in `src/index.ts`
- [ ] Setup `StdioServerTransport` and start server
- [ ] Write unit tests for store logic
- [ ] Write integration tests for MCP tool calls
- [ ] Configure CI pipeline (build & test)
- [ ] Add README and usage examples
- [ ] Publish package and update agent configuration 