import { describe, expect, it } from "vitest";
import { registrationInputSchema } from "./registrationService";

const validRegistration = {
  teamName: "Signal Builders",
  leadName: "Asha Kumar",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  college: "Erode Sengunthar Engineering College",
  memberOne: "Asha Kumar",
  memberTwo: "Ravi Kumar",
  memberThree: "Meera K",
  memberFour: "Vikram S",
  memberFive: "Priya M",
  memberSix: "Dinesh K",
  memberCount: 6,
  domain: "AI, Electronics & Intelligent Systems",
  buildType: "software",
  transactionId: "UPI-1234567890",
  formStartedAt: Date.now() - 2_000,
  photoBase64: "data:image/jpeg;base64,dGVzdA==",
  photoName: "payment_proof.jpg",
  photoType: "image/jpeg",
};

describe("registrationInputSchema", () => {
  it("accepts a complete 6-member registration with photo", () => {
    expect(registrationInputSchema.parse(validRegistration)).toMatchObject({
      teamName: "Signal Builders",
      buildType: "software",
      memberCount: 6,
      memberSix: "Dinesh K",
    });
  });

  it("accepts 1 to 6 members accurately", () => {
    const singleMember = {
      ...validRegistration,
      memberCount: 1,
      memberTwo: undefined,
      memberThree: undefined,
      memberFour: undefined,
      memberFive: undefined,
      memberSix: undefined,
    };
    expect(registrationInputSchema.parse(singleMember).memberCount).toBe(1);
  });

  it("accepts normal bank and UPI transaction-reference punctuation while retaining a safe character set", () => {
    expect(
      registrationInputSchema.parse({
        ...validRegistration,
        transactionId: "UPI/2026-09-24: 1234_5678.90",
      }).transactionId
    ).toBe("UPI/2026-09-24: 1234_5678.90");
    expect(() => registrationInputSchema.parse({ ...validRegistration, transactionId: "UPI<script>" })).toThrow();
  });

  it("normalizes copied line breaks and invisible characters without changing the reference", () => {
    expect(
      registrationInputSchema.parse({
        ...validRegistration,
        transactionId: "  UPI-1234\u200B\n567890  ",
      }).transactionId
    ).toBe("UPI-1234 567890");
  });

  it("rejects invalid contact data, unsupported build values, out-of-range squad counts, and spam honeypots", () => {
    expect(() => registrationInputSchema.parse({ ...validRegistration, email: "not-an-email" })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, buildType: "upi" })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, memberCount: 0 })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, memberCount: 7 })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, memberCount: 6, memberSix: "" })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, transactionId: "x" })).toThrow();
    expect(() => registrationInputSchema.parse({ ...validRegistration, website: "bot" })).toThrow();
  });
});
