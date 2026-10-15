import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { validateFile, ALLOWED_MIME, MAX_FILE_BYTES } from "./validateFile";

// Feature: patient-booking-intake, Property 2: File validation accepts iff type and size are both allowed
describe("file validation (Property 2)", () => {
  it("accepts iff mime is allowed AND size <= 10MB", () => {
    const mimeArb = fc.oneof(
      fc.constantFrom(...ALLOWED_MIME),
      fc.constantFrom("image/gif", "text/plain", "application/zip", "video/mp4"),
    );
    fc.assert(
      fc.property(
        mimeArb,
        fc.integer({ min: 0, max: MAX_FILE_BYTES * 2 }),
        (mime, sizeBytes) => {
          const result = validateFile({ mime, sizeBytes });
          const typeOk = (ALLOWED_MIME as readonly string[]).includes(mime);
          const sizeOk = sizeBytes <= MAX_FILE_BYTES;
          const expectedOk = typeOk && sizeOk;
          return result.ok === expectedOk;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accepts exactly 10MB and rejects 10MB + 1 byte", () => {
    expect(validateFile({ mime: "image/png", sizeBytes: MAX_FILE_BYTES }).ok).toBe(
      true,
    );
    const over = validateFile({ mime: "image/png", sizeBytes: MAX_FILE_BYTES + 1 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe("size");
  });
});
