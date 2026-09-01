import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { BCRYPT_COST, DUMMY_PASSWORD_HASH } from "./dummy-hash";

/**
 * The sign-in path compares against DUMMY_PASSWORD_HASH when no account matches
 * the submitted email, so that a missing account and a wrong password take the
 * same time. A malformed hash is rejected by bcrypt.compare() without doing any
 * key derivation, which silently reintroduces the timing oracle. These tests
 * assert the property that actually matters: the compare does real work.
 */
describe("DUMMY_PASSWORD_HASH", () => {
  it("is a syntactically valid bcrypt hash", () => {
    expect(DUMMY_PASSWORD_HASH).toHaveLength(60);
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
  });

  it("uses the same cost factor as registration", () => {
    expect(Number(DUMMY_PASSWORD_HASH.split("$")[2])).toBe(BCRYPT_COST);
  });

  it("does not match a submitted password", async () => {
    await expect(bcrypt.compare("any-password", DUMMY_PASSWORD_HASH)).resolves.toBe(false);
  });

  it("costs the same to reject as a real hash of the same cost", async () => {
    const real = await bcrypt.hash("a-real-account-password", BCRYPT_COST);

    const time = async (hash: string) => {
      const t0 = process.hrtime.bigint();
      await bcrypt.compare("wrong-password", hash);
      return Number(process.hrtime.bigint() - t0) / 1e6;
    };

    // Warm up so the first call does not carry module-init cost.
    await time(real);

    const dummyMs = await time(DUMMY_PASSWORD_HASH);
    const realMs = await time(real);

    // The original bug produced a ~1600x gap (0.2ms vs 348ms). A generous
    // 4x bound catches that class of regression without being flaky on a
    // loaded CI machine.
    const ratio = Math.max(dummyMs, realMs) / Math.min(dummyMs, realMs);
    expect(ratio).toBeLessThan(4);
  });
});
