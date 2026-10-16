import { describe, expect, it } from "vitest";

import * as randomSecret from "./random-secret";

describe("createRandomSecret", () => {
  it("maps random values to inclusive integer bounds", () => {
    expect(randomSecret.createRandomSecret).toBeTypeOf("function");
    expect(randomSecret.createRandomSecret(1, 100, () => 0)).toBe(1);
    expect(randomSecret.createRandomSecret(1, 100, () => 0.999999)).toBe(100);
  });

  it.each([-0.001, 1, Number.NaN])("rejects random source value %s outside [0, 1)", (value) => {
    expect(() => randomSecret.createRandomSecret(1, 100, () => value)).toThrow(RangeError);
  });
});
