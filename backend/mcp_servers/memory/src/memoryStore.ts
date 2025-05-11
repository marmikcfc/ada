// @ts-nocheck
// @ts-ignore: no types for mem0ai/oss
import { Memory } from 'mem0ai/oss';
import { memoryConfig } from './config.js';

export interface MemoryItem {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
}

export class MemoryStore {
  private memory: Memory;

  constructor() {
    // Initialize Mem0 Memory client with graph store config
    this.memory = new Memory(memoryConfig);
    console.info('[MemoryStore] Initialized with config:', memoryConfig);
  }

  async upsert(params: { userId?: string; skill: string; memory_type: string; content: string; tags?: string[]; meta?: any }): Promise<string> {
    console.info('[MemoryStore.upsert] params:', params);
    try {
      const messages = [{ role: 'user', content: params.content }];
      const response = await this.memory.add(messages, {
        userId: params.userId ?? 'ada',
        agentId: params.skill,
        metadata: { memory_type: params.memory_type, tags: params.tags, ...params.meta }
      });
      const id = response.results?.[0]?.id || '';
      console.info('[MemoryStore.upsert] created ID:', id);
      return id;
    } catch (error) {
      console.info('[MemoryStore.upsert] error:', error);
      throw error;
    }
  }

  async query(params: { query: string; k?: number; memory_type?: string; skill?: string; filter?: any }): Promise<MemoryItem[]> {
    console.log('[MemoryStore.query] params:', params);
    try {
      const resp = await this.memory.search(params.query, {
        userId: params.userId || 'ada',
        agentId: params?.skill || '',
        limit: params.k
      });
      console.log(JSON.stringify(resp))
      const items = resp.results.map((r: any) => ({ id: r.id, memory: r.memory, score: r.score, metadata: r.metadata || r }));
      console.info('[MemoryStore.query] results count:', items.length);
      return items;
    } catch (error) {
      console.info('[MemoryStore.query] error:', error);
      throw error;
    }
  }

  async list(params: { cursor?: string; limit?: number; filter?: any }): Promise<{ items: MemoryItem[]; nextCursor: string | null }> {
    console.info('[MemoryStore.list] params:', params);
    try {
      const resp = await this.memory.getAll({
        userId: params.userId || 'ada',
        agentId: params?.skill || '',
        limit: params.limit
      });
      const items = resp.results.map((r: any) => ({ id: r.id, memory: r.memory, metadata: r.metadata || r }));
      console.info('[MemoryStore.list] retrieved items:', items.length);
      return { items, nextCursor: null };
    } catch (error) {
      console.info('[MemoryStore.list] error:', error);
      throw error;
    }
  }

  async get(id: string): Promise<MemoryItem | undefined> {
    console.info('[MemoryStore.get] id:', id);
    try {
      const response = await this.memory.get(id);
      if (!response) {
        console.info('[MemoryStore.get] not found:', id);
        return undefined;
      }
      const item = { id: response.id, memory: response.memory, metadata: response };
      console.info('[MemoryStore.get] found item:', id);
      return item;
    } catch (error) {
      console.info('[MemoryStore.get] error:', error);
      throw error;
    }
  }

  async delete(params: { id: string }): Promise<boolean> {
    console.info('[MemoryStore.delete] id:', params.id);
    try {
      await this.memory.delete(params.id);
      console.info('[MemoryStore.delete] deleted:', params.id);
      return true;
    } catch (error) {
      console.info('[MemoryStore.delete] error:', error);
      throw error;
    }
  }

  async getProcedure(params: { skill: string; key: string }): Promise<string> {
    console.info('[MemoryStore.getProcedure] params:', params);
    try {
      const proc = `Procedure for skill ${params.skill} and key ${params.key}`;
      console.info('[MemoryStore.getProcedure] proc:', proc);
      return proc;
    } catch (error) {
      console.info('[MemoryStore.getProcedure] error:', error);
      throw error;
    }
  }

  async reindexEmbeddings(params: { ids?: string[]; model_id?: string }): Promise<boolean> {
    console.info('[MemoryStore.reindexEmbeddings] params:', params);
    try {
      // stub implementation
      console.info('[MemoryStore.reindexEmbeddings] complete');
      return true;
    } catch (error) {
      console.info('[MemoryStore.reindexEmbeddings] error:', error);
      throw error;
    }
  }
} 