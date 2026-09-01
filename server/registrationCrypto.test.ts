import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "registration-test-secret";
});

describe("registrationCrypto", () => {
  it("encrypts sensitive values with unique authenticated ciphertext and restores the original value", async () => {
    const { decryptRegistrationValue, encryptRegistrationValue, transactionFingerprint } = await import("./registrationCrypto");
    const first = encryptRegistrationValue("UTR-1234567890");
    const second = encryptRegistrationValue("UTR-1234567890");
    expect(first).not.toBe(second);
    expect(decryptRegistrationValue(first)).toBe("UTR-1234567890");
    expect(transactionFingerprint("utr-1234567890")).toBe(transactionFingerprint("UTR-1234567890"));
  });

  it("matches spaced and compact pasted references for duplicate detection", async () => {
    const { transactionFingerprint, transactionFingerprints } = await import("./registrationCrypto");
    const compact = transactionFingerprint("UPI-1234567890");
    expect(transactionFingerprints("UPI-1234\u200B\n567890")).toContain(compact);
    expect(transactionFingerprints("UPI-1234 567890")).toContain(compact);
  });

  it("rejects modified encrypted payloads", async () => {
    const { decryptRegistrationValue, encryptRegistrationValue } = await import("./registrationCrypto");
    const payload = encryptRegistrationValue("private-email@example.com");
    expect(() => decryptRegistrationValue(`${payload}corrupt`)).toThrow();
  });
});
