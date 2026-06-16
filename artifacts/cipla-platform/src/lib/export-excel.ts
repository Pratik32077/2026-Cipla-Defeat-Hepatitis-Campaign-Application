import * as XLSX from "xlsx";
import { format } from "date-fns";

function getToken(): string | null {
  return localStorage.getItem("cipla_token");
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch(path: string, params?: Record<string, any>) {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "all") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function autoColWidths(data: (string | number | null | undefined)[][]): XLSX.ColInfo[] {
  if (!data.length) return [];
  return data[0].map((_, ci) => ({
    wch: Math.min(50, Math.max(12, ...data.map(row => String(row[ci] ?? "").length + 2))),
  }));
}

function makeSheet(headers: string[], rows: (string | number | null | undefined)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = autoColWidths([headers, ...rows]);
  return ws;
}

function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try { return format(new Date(d), "dd-MM-yyyy"); } catch { return String(d); }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

function todayStr(): string {
  return format(new Date(), "yyyy_MM_dd");
}

// ─── MANAGER: Export own doctors ─────────────────────────────────────────────
export async function exportManagerDoctors(
  managerName: string,
  filters?: {
    search?: string;
    language?: string;
    city?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const data = await apiFetch("/api/doctors", { limit: 10000, ...filters });
  const doctors = data.data ?? [];

  const headers = [
    "Doctor Name", "Specialty", "City",
    "Language", "Video Status", "Created Date", "Last Updated Date",
  ];
  const rows = doctors.map((d: any) => [
    d.name, d.specialization, d.city,
    d.language, d.status?.toUpperCase() ?? "PENDING",
    fmtDate(d.createdAt), fmtDate(d.updatedAt),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows), "Doctors");
  triggerDownload(wb, `${sanitize(managerName)}_Doctors_${todayStr()}`);
}

// ─── ADMIN: Export all managers ──────────────────────────────────────────────
export async function exportAllManagers() {
  const data = await apiFetch("/api/managers", { limit: 10000 });
  const managers = data.data ?? [];

  // Fetch doctor counts per manager
  const progressData = await apiFetch("/api/analytics/manager-stats").catch(() => ({ stats: [] }));
  const progressMap = new Map<number, number>();
  (progressData.stats ?? []).forEach((s: any) => progressMap.set(s.managerId, s.doctorsAdded ?? 0));

  const headers = [
    "Manager Name", "Employee Code", "Region", "HQ",
    "Email", "Mobile Number", "Target Doctors",
    "Doctors Added", "Remaining Doctors", "Progress %", "Status",
  ];
  const rows = managers.map((m: any) => {
    const added = progressMap.get(m.id) ?? 0;
    const remaining = Math.max(0, (m.targetDoctors ?? 85) - added);
    const progress = m.targetDoctors ? Math.round((added / m.targetDoctors) * 100) : 0;
    return [
      m.name, m.employeeCode, m.region, m.headquarters,
      m.email, m.mobile, m.targetDoctors ?? 85,
      added, remaining, `${progress}%`, m.isActive ? "Active" : "Inactive",
    ];
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows), "Managers");
  triggerDownload(wb, `All_Managers_Report_${todayStr()}`);
}

// ─── ADMIN: Export single manager + their doctors ────────────────────────────
export async function exportSingleManager(managerId: number, managerName: string) {
  const [mgrData, doctorsData] = await Promise.all([
    apiFetch(`/api/managers/${managerId}`),
    apiFetch("/api/doctors", { managerId, limit: 10000 }),
  ]);
  const m = mgrData;
  const doctors = doctorsData.data ?? [];
  const added = doctors.length;
  const remaining = Math.max(0, (m.targetDoctors ?? 85) - added);
  const progress = m.targetDoctors ? Math.round((added / m.targetDoctors) * 100) : 0;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Manager info
  const infoHeaders = ["Field", "Value"];
  const infoRows = [
    ["Name", m.name ?? ""],
    ["Employee Code", m.employeeCode ?? ""],
    ["Region", m.region ?? ""],
    ["HQ", m.headquarters ?? ""],
    ["Mobile", m.mobile ?? ""],
    ["Email", m.email ?? ""],
    ["Status", m.isActive ? "Active" : "Inactive"],
    ["", ""],
    ["Target Doctors", m.targetDoctors ?? 85],
    ["Doctors Added", added],
    ["Remaining Doctors", remaining],
    ["Progress %", `${progress}%`],
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(infoHeaders, infoRows), "Manager Info");

  // Sheet 2: Doctors list
  const docHeaders = [
    "Doctor Name", "Specialty", "City",
    "Language", "Video Status", "Created Date",
  ];
  const docRows = doctors.map((d: any) => [
    d.name, d.specialization, d.city,
    d.language, d.status?.toUpperCase() ?? "PENDING", fmtDate(d.createdAt),
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(docHeaders, docRows), "Doctors");

  triggerDownload(wb, `${sanitize(managerName)}_Report_${todayStr()}`);
}

// ─── ADMIN: Export doctors with filters ──────────────────────────────────────
export async function exportAdminDoctors(filters?: {
  search?: string;
  language?: string;
  managerId?: string;
  status?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const data = await apiFetch("/api/doctors", { limit: 10000, ...filters });
  const doctors = data.data ?? [];

  const headers = [
    "Doctor Name", "Specialty", "City",
    "Language", "Manager Name", "Video Status", "Created Date",
  ];
  const rows = doctors.map((d: any) => [
    d.name, d.specialization, d.city,
    d.language, d.managerName ?? "", d.status?.toUpperCase() ?? "PENDING", fmtDate(d.createdAt),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows), "Doctors");
  triggerDownload(wb, `Doctors_Report_${todayStr()}`);
}

// ─── ADMIN: Export dashboard / campaign report ────────────────────────────────
export async function exportDashboardReport() {
  const [stats, leaderboard, langDist] = await Promise.all([
    apiFetch("/api/analytics/dashboard"),
    apiFetch("/api/analytics/leaderboard"),
    apiFetch("/api/analytics/language-distribution"),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Campaign Summary
  const summaryHeaders = ["Metric", "Value"];
  const GLOBAL_TARGET = 7055;
  const added = stats.totalDoctorsAdded ?? 0;
  const summaryRows: (string | number)[][] = [
    ["Total Target Doctors", GLOBAL_TARGET],
    ["Total Doctors Added", added],
    ["Remaining Doctors", Math.max(0, GLOBAL_TARGET - added)],
    ["Overall Progress %", `${Math.min(100, Math.round((added / GLOBAL_TARGET) * 100))}%`],
    ["Total Managers", stats.totalManagers ?? 0],
    ["Active Managers", stats.activeManagers ?? 0],
    ["Videos Generated", stats.videosGenerated ?? 0],
    ["Pending Videos", stats.pendingVideos ?? 0],
    ["Failed Videos", stats.failedVideos ?? 0],
    ["Today's Doctors Added", stats.todayDoctorsAdded ?? 0],
    ["Today's Videos Generated", stats.todayVideosGenerated ?? 0],
    ["Report Generated On", format(new Date(), "dd-MM-yyyy HH:mm")],
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(summaryHeaders, summaryRows), "Campaign Summary");

  // Sheet 2: Top Performers
  const topHeaders = ["Rank", "Manager Name", "Region", "Doctors Added", "Target", "Progress %"];
  const topRows = (leaderboard.topPerformers ?? []).map((e: any, i: number) => [
    i + 1, e.managerName, e.region, e.doctorsAdded, e.target, `${e.progressPercent}%`,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(topHeaders, topRows), "Top Performers");

  // Sheet 3: Lowest Performers
  const lowRows = (leaderboard.lowestPerformers ?? []).map((e: any, i: number) => [
    i + 1, e.managerName, e.region, e.doctorsAdded, e.target, `${e.progressPercent}%`,
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(topHeaders, lowRows), "Lowest Performers");

  // Sheet 4: Language Distribution
  const langHeaders = ["Language", "Doctor Count"];
  const langRows = (Array.isArray(langDist) ? langDist : []).map((l: any) => [l.label, l.count]);
  XLSX.utils.book_append_sheet(wb, makeSheet(langHeaders, langRows), "Language Distribution");

  triggerDownload(wb, `Campaign_Overview_Report_${todayStr()}`);
}
