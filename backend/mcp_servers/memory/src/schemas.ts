export const upsertMemorySchema = {
  type: "object",
  properties: {
    skill: { type: "string" },
    memory_type: { type: "string" },
    content: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    meta: { type: "object" }
  },
  required: ["skill", "memory_type", "content"]
};

export const queryMemorySchema = {
  type: "object",
  properties: {
    query: { type: "string" },
    k: { type: "number" },
    memory_type: { type: "string" },
    skill: { type: "string" },
    filter: { type: "object" }
  },
  required: ["query"]
};

export const listMemoryItemsSchema = {
  type: "object",
  properties: {
    cursor: { type: "string" },
    limit: { type: "number" },
    filter: { type: "object" }
  }
};

export const getProcedureSchema = {
  type: "object",
  properties: {
    skill: { type: "string" },
    key: { type: "string" }
  },
  required: ["skill", "key"]
};

export const deleteMemoryItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" }
  },
  required: ["id"]
};

export const reindexEmbeddingsSchema = {
  type: "object",
  properties: {
    ids: { type: "array", items: { type: "string" } },
    model_id: { type: "string" }
  }
}; 