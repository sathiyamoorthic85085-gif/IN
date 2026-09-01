import * as XLSX from "xlsx";
import { useState } from "react";
import { Download, FileDown, FileSpreadsheet, LockKeyhole, RefreshCw } from "lucide-react";
import { startLogin } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createRegistrationCsv, createRegistrationWorkbook, type RegistrationExportScope } from "@/lib/registrationExport";

export default function AdminRegistrations() {
  const { user, loading } = useAuth();
  const exportRows = trpc.registration.exportRows.useQuery(undefined, {
    enabled: Boolean(user?.role === "admin"),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const getLatestRows = async () => {
    const latest = await exportRows.refetch();
    if (latest.error) throw latest.error;
    if (!latest.data) throw new Error("No registration data was returned.");
    return latest.data;
  };

  const downloadWorkbook = async () => {
    setIsDownloading(true);
    try {
      const latest = await getLatestRows();
      const workbook = createRegistrationWorkbook(latest);
      XLSX.writeFile(workbook, `innohack26-registrations-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("[RegistrationExport] Failed to download fresh registrations", error);
      toast.error("The latest registration details could not be loaded. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadCsv = async (scope: RegistrationExportScope) => {
    setIsDownloading(true);
    try {
      const latest = await getLatestRows();
      const csv = createRegistrationCsv(latest, scope);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `innohack26-registrations-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[RegistrationExport] Failed to download fresh CSV", error);
      toast.error("The latest registration details could not be loaded. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return <main className="admin-state">Checking organiser access…</main>;
  if (!user) return <main className="admin-state"><LockKeyhole size={32} /><h1>ORGANISER ACCESS</h1><p>Sign in with the InnoHack organiser account to export private registration details.</p><Button onClick={() => startLogin()}>SIGN IN</Button></main>;
  if (user.role !== "admin") return <main className="admin-state"><LockKeyhole size={32} /><h1>ACCESS RESTRICTED</h1><p>This export is available only to the project owner / organiser account.</p></main>;

  const disabled = !exportRows.data || exportRows.isFetching || isDownloading;
  return <DashboardLayout><section className="admin-export"><p className="eyebrow"><FileSpreadsheet size={15} /> ORGANISER REGISTRATION EXPORT</p><h1>REGISTRATION <i>CONTROL.</i></h1><p>Download the latest exact registration details from the database. Every click re-syncs before creating a workbook with <strong>16 separate worksheets</strong>: each innovation domain has its own Software and Hardware squad sheet. Payment remains pending until the organiser verifies the submitted UTR.</p><div className="admin-export-actions"><Button onClick={downloadWorkbook} disabled={disabled}><Download size={17} /> {isDownloading ? "SYNCING LATEST DATA…" : "DOWNLOAD 16-SHEET EXCEL"}</Button><Button variant="outline" onClick={() => exportRows.refetch()} disabled={exportRows.isFetching || isDownloading}><RefreshCw size={17} /> REFRESH</Button></div><div className="admin-export-csv-actions"><p><FileDown size={15} /> CSV DOWNLOADS</p><div><Button variant="outline" onClick={() => downloadCsv("all")} disabled={disabled}>ALL REGISTRATIONS CSV</Button><Button variant="outline" onClick={() => downloadCsv("software")} disabled={disabled}>SOFTWARE CSV</Button><Button variant="outline" onClick={() => downloadCsv("hardware")} disabled={disabled}>HARDWARE CSV</Button></div></div><p className="admin-export-sync">{exportRows.dataUpdatedAt ? `Last synchronized ${new Date(exportRows.dataUpdatedAt).toLocaleString()}. Every download performs a fresh sync.` : "Waiting for the first live database sync…"}</p>{exportRows.isError ? <p className="admin-error">Unable to load registrations. Please refresh or verify organiser access.</p> : <div className="admin-export-stats"><div><b>{exportRows.data?.software.length ?? 0}</b><span>SOFTWARE SQUADS</span></div><div><b>{exportRows.data?.hardware.length ?? 0}</b><span>HARDWARE SQUADS</span></div></div>}</section></DashboardLayout>;
}
