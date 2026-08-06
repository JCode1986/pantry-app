import { vi } from "vitest";

export function createStripeMock(overrides = {}) {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ id: "cs_test_1", url: "https://stripe.test/checkout" })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ id: "bps_test_1", url: "https://stripe.test/portal" })),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    ...overrides,
  };
}
