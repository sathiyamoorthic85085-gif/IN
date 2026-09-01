import * as XLSX from "xlsx";

export type RegistrationExportRow = {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberOne: string;
  memberTwo?: string | null;
  memberThree: string | null;
  memberFour: string | null;
  memberFive?: string | null;
  memberSix?: string | null;
  memberCount: number;
  domain: string;
  buildType: "software" | "hardware";
  transactionId: string;
  paymentStatus: "payment_pending" | "verified" | "rejected";
  createdAt: Date;
};

const domainSheetDefinitions = [
  ["AgriTech & GreenTech", "AgriTech"],
  ["Robotics & Drones", "Robotics"],
  ["Healthcare & Assistive Technology", "Healthcare"],
  ["Sustainable & Clean Technology", "Sustainability"],
  ["Industrial Automation & Smart Manufacturing", "Industrial"],
  ["AI, Electronics & Intelligent Systems", "AI & Electronics"],
  ["Smart Cities & Mobility", "Smart Cities"],
  ["Open Innovation", "Open Innovation"],
] as const;

const spreadsheetRows = (rows: RegistrationExportRow[]) => rows.map((row) => ({
  "Registration Reference (Alphanumeric)": String(row.referenceCode),
  "Team Name (Text)": String(row.teamName),
  "Team Lead (Text)": String(row.leadName),
  "Email (Text)": String(row.email),
  "Phone (Text)": String(row.phone),
  "College / Institution (Text)": String(row.college),
  "Member 1 (Text)": String(row.memberOne),
  "Member 2 (Text)": row.memberTwo ?? "",
  "Member 3 (Text)": row.memberThree ?? "",
  "Member 4 (Text)": row.memberFour ?? "",
  "Member 5 (Text)": row.memberFive ?? "",
  "Member 6 (Text)": row.memberSix ?? "",
  "Member Count (Number)": Number(row.memberCount),
  "Innovation Domain (Text)": String(row.domain),
  "Build Type (Text)": String(row.buildType),
  "Transaction ID / UTR (Alphanumeric)": String(row.transactionId),
  "Payment Status (Text)": String(row.paymentStatus),
  "Submitted (UTC)": row.createdAt.toISOString(),
}));

export type RegistrationExportScope = "all" | "software" | "hardware";

export function createRegistrationWorkbook(data: { software: RegistrationExportRow[]; hardware: RegistrationExportRow[] }) {
  const workbook = XLSX.utils.book_new();
  const appendSheets = (rows: RegistrationExportRow[], buildType: "Software" | "Hardware") => {
    domainSheetDefinitions.forEach(([domain, shortName]) => {
      const domainRows = rows.filter((row) => row.domain === domain);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(spreadsheetRows(domainRows)), `${shortName} - ${buildType}`);
    });
  };
  appendSheets(data.software, "Software");
  appendSheets(data.hardware, "Hardware");
  return workbook;
}

export function createRegistrationCsv(
  data: { software: RegistrationExportRow[]; hardware: RegistrationExportRow[] },
  scope: RegistrationExportScope = "all",
) {
  const rows = scope === "software" ? data.software : scope === "hardware" ? data.hardware : [...data.software, ...data.hardware];
  const worksheet = XLSX.utils.json_to_sheet(spreadsheetRows(rows));
  return `\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`;
}
