import { MemoryConfig } from "mem0ai/oss";

export const memoryConfig: MemoryConfig = {
  version: 'v2',
  vectorStore: {
    provider: 'memory',
    config: {
      collectionName: 'memories',
      dimension: 1536,
      onDisk: true,
    },
  },
  graphStore: {
    provider: process.env.GRAPH_PROVIDER || 'neo4j',
    config: {
      url: process.env.GRAPH_DB_URL || '',
      username: process.env.GRAPH_DB_USERNAME || '',
      password: process.env.GRAPH_DB_PASSWORD || ''
    }
  },

  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    },
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  },
}; 
