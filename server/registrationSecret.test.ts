import { describe, expect, it } from "vitest";
import { decryptRegistrationValue, encryptRegistrationValue } from "./registrationCrypto";

describe("cross-host registration encryption configuration", () => {
  it("round-trips a probe with the configured deployment secret", () => {
    const configuredSecret = process.env.REGISTRATION_ENCRYPTION_SECRET || process.env.JWT_SECRET || "test-registration-secret";
    process.env.JWT_SECRET = configuredSecret;
    expect(configuredSecret).toBeTruthy();
    const encrypted = encryptRegistrationValue("registration-config-probe");
    expect(decryptRegistrationValue(encrypted)).toBe("registration-config-probe");
  });
});
