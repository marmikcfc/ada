#!/usr/bin/env node

/**
 * Memory MCP Server
 * Provides memory operations via MCP:
 * - Listing memory items as resources
 * - Reading specific memory item content
 * - Memory tool operations: upsert_memory, query_memory, list_memory_items,
 *   get_procedure, delete_memory_item, reindex_embeddings
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MemoryStore, MemoryItem } from "./memoryStore.js";
import {
  upsertMemorySchema,
  queryMemorySchema,
  listMemoryItemsSchema,
  getProcedureSchema,
  deleteMemoryItemSchema,
  reindexEmbeddingsSchema
} from './schemas.js';

const store = new MemoryStore();

/**
 * Initialize an MCP server with support for resources (memory items) and tools (memory operations).
 */
const server = new Server(
  {
    name: "memory",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing memory items as resources.
 * Each memory item is exposed as a resource with:
 * - A memory:// URI scheme
 * - application/json MIME type
 * - Name and description derived from memory content
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.info('[ListResources] Invoked');
  try {
    const { items } = await store.list({});
    const resources = items.map((item: MemoryItem) => ({
      uri: `memory://${item.metadata?.memory_type}/${item.id}`,
      mimeType: "application/json",
      name: `${item.metadata?.memory_type} memory item`,  
      description: (item.memory || "").slice(0, 50),
    }));
    console.info(`[ListResources] Found ${resources.length} items`);
    return { resources };
  } catch (error) {
    console.info('[ListResources] Error:', error);
    throw error;
  }
});

/**
 * Handler for reading the contents of a specific memory item.
 * Takes a memory:// URI and returns the memory content.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  console.info('[ReadResource] Invoked with URI:', request.params.uri);
  try {
    const url = new URL(request.params.uri);
    const id = url.pathname.replace(/^\//, "");
    const item = await store.get(id);
    if (!item) {
      const err = new Error(`Memory item ${id} not found`);
      console.info('[ReadResource] Error:', err);
      throw err;
    }
    const contents = [{
      uri: request.params.uri,
      mimeType: "application/json",
      text: item.memory,
      meta: item.metadata,
    }];
    console.info(`[ReadResource] Returning contents for ID ${id}`);
    return { contents };
  } catch (error) {
    console.info('[ReadResource] Error:', error);
    throw error;
  }
});

/**
 * Handler that lists available memory tools.
 * Exposes operations for:
 * - upsert_memory
 * - query_memory
 * - list_memory_items
 * - get_procedure
 * - delete_memory_item
 * - reindex_embeddings
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.info('[ListTools] Invoked');
  try {
    const tools = [
      { name: "upsert_memory", description: "Add or update memory nodes", inputSchema: upsertMemorySchema },
      { name: "query_memory", description: "Vector and graph search over memory", inputSchema: queryMemorySchema },
      { name: "list_memory_items", description: "Paginated metadata of memory items", inputSchema: listMemoryItemsSchema },
      { name: "get_procedure", description: "Retrieve procedural prompt", inputSchema: getProcedureSchema },
      { name: "delete_memory_item", description: "Hard delete memory item", inputSchema: deleteMemoryItemSchema },
      { name: "reindex_embeddings", description: "Re-embed selected memory nodes", inputSchema: reindexEmbeddingsSchema },
    ];
    console.info(`[ListTools] Registered ${tools.length} tools`);
    return { tools };
  } catch (error) {
    console.info('[ListTools] Error:', error);
    throw error;
  }
});

/**
 * Handler for memory tool calls.
 * Processes upsert_memory, query_memory, list_memory_items, get_procedure,
 * delete_memory_item, and reindex_embeddings.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.info('[CallTool] Invoked for tool:', request.params.name, 'with args:', request.params.arguments);
  try {
    const args = request.params.arguments || {};
    switch (request.params.name) {
      case "upsert_memory": {
        const skill = String(args.skill);
        const memory_type = String(args.memory_type);
        const content = String(args.content);
        const tags = Array.isArray(args.tags) ? args.tags.map(String) : undefined;
        const meta = args.meta;
        const id = await store.upsert({ skill, memory_type, content, tags, meta });
        const uri = `memory://${memory_type}/${id}`;
        return { content: [{ type: "text", text: uri }] };
      }
      case "query_memory": {
        const results = await store.query({
          query: String(args.query),
          k: typeof args.k === "number" ? args.k : undefined,
          memory_type: args.memory_type as string | undefined,
          skill: args.skill as string | undefined,
          filter: args.filter,
        });
        console.info('[CallTool.query_memory] results:', results);
        return { content: [{ type: "text", text: JSON.stringify(results) }] };
      }
      case "list_memory_items": {
        const { items, nextCursor } = await store.list({
          cursor: typeof args.cursor === "string" ? args.cursor : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
          filter: args.filter,
        });
        const payload = {
          items: items.map((item: MemoryItem) => ({ id: item.id, skill: item.metadata?.memory_type, memory_type: item.metadata?.memory_type })),
          nextCursor,
        };
        return { content: [{ type: "text", text: JSON.stringify(payload) }] };
      }
      case "get_procedure": {
        const procedure = await store.getProcedure({ skill: String(args.skill), key: String(args.key) });
        return { content: [{ type: "text", text: procedure }] };
      }
      case "delete_memory_item": {
        const id = String(args.id);
        const success = await store.delete({ id });
        return { content: [{ type: "text", text: success ? `Deleted memory item ${id}` : `Memory item ${id} not found` }] };
      }
      case "reindex_embeddings": {
        const success = await store.reindexEmbeddings({
          ids: Array.isArray(args.ids) ? args.ids.map(String) : undefined,
          model_id: typeof args.model_id === "string" ? args.model_id : undefined,
        });
        return { content: [{ type: "text", text: success ? "Reindexed embeddings successfully" : "Failed to reindex embeddings" }] };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.info(`[CallTool] Error in tool ${request.params.name}:`, error);
    throw error;
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  console.info('Starting Memory MCP Server...');
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.info('Memory MCP Server running');
  } catch (error) {
    console.info('Server initialization error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.info("Server error:", error);
  process.exit(1);
});
