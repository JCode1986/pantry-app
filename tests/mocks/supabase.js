import { vi } from "vitest";

export function createSupabaseResponse({ data = null, error = null, count = null } = {}) {
  return { data, error, count };
}

export function createSupabaseQuery(response = createSupabaseResponse()) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    upsert: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    not: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(async () => response),
    maybeSingle: vi.fn(async () => response),
    then: (resolve, reject) => Promise.resolve(response).then(resolve, reject),
  };

  return query;
}

export function createSupabaseMock(tableResponses = {}) {
  const queries = new Map();
  const queryHistory = new Map();
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      setSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => createSupabaseResponse()),
    from: vi.fn((table) => {
      const configuredResponse = tableResponses[table];
      const response = Array.isArray(configuredResponse)
        ? configuredResponse.shift() ?? createSupabaseResponse()
        : configuredResponse ?? createSupabaseResponse();
      const query = createSupabaseQuery(response);
      queries.set(table, query);
      queryHistory.set(table, [...(queryHistory.get(table) ?? []), query]);
      return query;
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => createSupabaseResponse({ data: { signedUrl: "https://example.test/image.jpg" } })),
        remove: vi.fn(async () => createSupabaseResponse({ data: [] })),
      })),
    },
    __queries: queries,
    __queryHistory: queryHistory,
  };

  return client;
}
