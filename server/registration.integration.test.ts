import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocked = vi.hoisted(() => ({
  createSecureRegistration: vi.fn(),
  getSecureRegistrationsByBuildType: vi.fn(),
  transactionAlreadyUsed: vi.fn(),
}));

vi.mock("./db", () => ({
  createSecureRegistration: mocked.createSecureRegistration,
  getSecureRegistrationsByBuildType: mocked.getSecureRegistrationsByBuildType,
  transactionAlreadyUsed: mocked.transactionAlreadyUsed,
}));

import { appRouter } from "./routers";

const validSubmission = {
  teamName: "Circuit Sages",
  leadName: "Arun Kumar",
  email: "arun@example.com",
  phone: "+919876543210",
  college: "ESEC",
  memberOne: "Arun Kumar",
  memberTwo: "Meera Devi",
  memberThree: "Surya Raj",
  memberFour: "Kavi Priya",
  memberFive: "Priya S",
  memberSix: "Dinesh K",
  memberCount: 6,
  domain: "AI, Electronics & Intelligent Systems" as const,
  buildType: "hardware" as const,
  transactionId: "UPI-9876543210",
  website: "",
  formStartedAt: Date.now() - 2_000,
};

function context(role?: "admin" | "user"): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: "organiser",
          email: "organiser@example.com",
          name: "Organiser",
          loginMethod: "oauth",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { headers: { "x-real-ip": "127.0.0.1" }, protocol: "https" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("registration integration contracts", () => {
  beforeEach(() => {
    mocked.createSecureRegistration.mockReset().mockResolvedValue(undefined);
    mocked.transactionAlreadyUsed.mockReset().mockResolvedValue(false);
    mocked.getSecureRegistrationsByBuildType
      .mockReset()
      .mockImplementation(async (buildType: "software" | "hardware") =>
        buildType === "software"
          ? [
              {
                referenceCode: "IH26-SW",
                teamName: "Software Team",
                leadName: "Lead",
                email: "lead@example.com",
                phone: "+919999999999",
                college: "ESEC",
                memberOne: "A",
                memberTwo: "B",
                memberThree: null,
                memberFour: null,
                memberFive: null,
                memberSix: null,
                memberCount: 2,
                domain: "Open Innovation",
                buildType,
                transactionId: "UTR-SW",
                paymentStatus: "payment_pending",
                createdAt: new Date("2026-09-01T00:00:00Z"),
              },
            ]
          : [
              {
                referenceCode: "IH26-HW",
                teamName: "Hardware Team",
                leadName: "Lead",
                email: "lead@example.com",
                phone: "+918888888888",
                college: "ESEC",
                memberOne: "C",
                memberTwo: "D",
                memberThree: null,
                memberFour: null,
                memberFive: null,
                memberSix: null,
                memberCount: 2,
                domain: "Robotics & Drones",
                buildType,
                transactionId: "UTR-HW",
                paymentStatus: "payment_pending",
                createdAt: new Date("2026-09-01T00:00:00Z"),
              },
            ]
      );
  });

  it("submits a six-member hardware squad with UTR through the encrypted storage boundary", async () => {
    const result = await appRouter.createCaller(context()).registration.submit(validSubmission);
    expect(result.paymentStatus).toBe("payment_pending");
    expect(mocked.createSecureRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        buildType: "hardware",
        memberCount: 6,
        transactionId: "UPI-9876543210",
        memberSix: "Dinesh K",
      })
    );
  });

  it("returns separate rows only to an organiser admin", async () => {
    const rows = await appRouter.createCaller(context("admin")).registration.exportRows();
    expect(rows.software).toHaveLength(1);
    expect(rows.hardware).toHaveLength(1);
    await expect(appRouter.createCaller(context("user")).registration.exportRows()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(appRouter.createCaller(context()).registration.exportRows()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
