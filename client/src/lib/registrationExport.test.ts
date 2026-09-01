import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { createRegistrationCsv, createRegistrationWorkbook, type RegistrationExportRow } from "./registrationExport";

const row: RegistrationExportRow = {
  referenceCode: "IH26-TEST",
  teamName: "Test Squad",
  leadName: "Test Lead",
  email: "lead@example.com",
  phone: "+919999999999",
  college: "ESEC",
  memberOne: "One",
  memberTwo: "Two",
  memberThree: null,
  memberFour: null,
  memberFive: null,
  memberSix: null,
  memberCount: 2,
  domain: "Open Innovation",
  buildType: "software",
  transactionId: "UTR-123456",
  paymentStatus: "payment_pending",
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

describe("registration workbook", () => {
  it("creates all eight domain sheets for each build type without browser downloads", () => {
    const workbook = createRegistrationWorkbook({
      software: [row],
      hardware: [{ ...row, referenceCode: "IH26-HW", buildType: "hardware" }],
    });
    expect(workbook.SheetNames).toHaveLength(16);
    expect(workbook.SheetNames).toContain("Open Innovation - Software");
    expect(workbook.SheetNames).toContain("Open Innovation - Hardware");
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Open Innovation - Software"])).toHaveLength(1);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Open Innovation - Hardware"])).toHaveLength(1);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Robotics - Software"])).toHaveLength(0);
  });

  it("preserves the exact entered member, payment, and timestamp values in the matching sheet", () => {
    const workbook = createRegistrationWorkbook({ software: [row], hardware: [] });
    const [exported] = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets["Open Innovation - Software"]
    );
    expect(exported).toMatchObject({
      "Registration Reference (Alphanumeric)": "IH26-TEST",
      "Team Name (Text)": "Test Squad",
      "Team Lead (Text)": "Test Lead",
      "Email (Text)": "lead@example.com",
      "Phone (Text)": "+919999999999",
      "College / Institution (Text)": "ESEC",
      "Member 1 (Text)": "One",
      "Member 2 (Text)": "Two",
      "Member 3 (Text)": "",
      "Member 4 (Text)": "",
      "Member 5 (Text)": "",
      "Member 6 (Text)": "",
      "Member Count (Number)": 2,
      "Innovation Domain (Text)": "Open Innovation",
      "Build Type (Text)": "software",
      "Transaction ID / UTR (Alphanumeric)": "UTR-123456",
      "Payment Status (Text)": "payment_pending",
      "Submitted (UTC)": "2026-09-01T00:00:00.000Z",
    });
  });

  it("creates readable CSV for all registrations and scoped build types", () => {
    const hardwareRow = {
      ...row,
      referenceCode: "IH26-HW",
      buildType: "hardware" as const,
      memberCount: 3,
      memberThree: "Three",
    };
    const data = { software: [row], hardware: [hardwareRow] };
    const allCsv = createRegistrationCsv(data);
    const softwareCsv = createRegistrationCsv(data, "software");
    const hardwareCsv = createRegistrationCsv(data, "hardware");
    expect(allCsv.replace(/^\uFEFF/, "")).toContain("Registration Reference (Alphanumeric),Team Name (Text)");
    expect(allCsv).toContain("IH26-TEST");
    expect(allCsv).toContain("IH26-HW");
    expect(allCsv).toContain(",3,");
    expect(allCsv).toContain("UTR-123456");
    expect(softwareCsv).toContain("IH26-TEST");
    expect(softwareCsv).not.toContain("IH26-HW");
    expect(hardwareCsv).toContain("IH26-HW");
    expect(hardwareCsv).not.toContain("IH26-TEST");
  });
});
