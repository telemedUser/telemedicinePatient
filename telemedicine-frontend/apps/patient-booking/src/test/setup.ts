import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { server } from "@/shared/mocks/server";

expect.extend(axeMatchers);

// jsdom does not implement canvas; axe-core touches getContext during its
// color-contrast rule. Provide a minimal stub so a11y assertions run.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());