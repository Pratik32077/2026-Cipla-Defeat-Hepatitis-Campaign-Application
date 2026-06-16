import { useState } from "react";
import { useListDoctors, useListManagers, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Stethoscope } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { exportAdminDoctors } from "@/lib/export-excel";

const VIDEO_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  completed:  { label: "Generated",  cls: "bg-green-100 text-green-800 border-green-200" },
  failed:     { label: "Failed",     cls: "bg-red-100 text-red-800 border-red-200" },
};

const DATE_PRESETS = [
  { label: "All Time",   value: "all" },
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
];

function getDateRange(preset: string): { dateFrom?: string; dateTo?: string } {
  const fmt = (d: Date) => d.toISOString();
  switch (preset) {
    case "today": { const d = new Date(); d.setHours(0,0,0,0); return { dateFrom: fmt(d) }; }
    case "yesterday": {
      const s = subDays(new Date(), 1); s.setHours(0,0,0,0);
      const e = subDays(new Date(), 1); e.setHours(23,59,59,999);
      return { dateFrom: fmt(s), dateTo: fmt(e) };
    }
    case "week":  return { dateFrom: fmt(startOfWeek(new Date(), { weekStartsOn: 1 })) };
    case "month": return { dateFrom: fmt(startOfMonth(new Date())) };
    default: return {};
  }
}

const LANGUAGES = ["Hindi","English","Marathi","Gujarati","Telugu","Tamil","Punjabi","Oriya","Malayalam","Kannada","Bengali","Assamese"];

export default function AdminDoctors() {
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [langFilter, setLangFilter] = useState("all");
  const [statusFilter, setStatus]   = useState("all");
  const [managerFilter, setManager] = useState("all");
  const [cityFilter, setCity]       = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const limit = 20;

  const dateRange = getDateRange(datePreset);
  const params: Record<string, any> = { page, limit };
  if (search)                  params.search    = search;
  if (langFilter !== "all")    params.language  = langFilter;
  if (statusFilter !== "all")  params.status    = statusFilter;
  if (managerFilter !== "all") params.managerId = managerFilter;
  if (cityFilter)              params.city      = cityFilter;
  if (dateRange.dateFrom)      params.dateFrom  = dateRange.dateFrom;
  if (dateRange.dateTo)        params.dateTo    = dateRange.dateTo;

  const { data, isLoading } = useListDoctors(params, { query: { queryKey: getListDoctorsQueryKey(params) } });
  const { data: managersData } = useListManagers({ limit: 500 });
  const managers = (managersData?.data as any[]) ?? [];
  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportAdminDoctors({
        search: search || undefined,
        language: langFilter !== "all" ? langFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        managerId: managerFilter !== "all" ? managerFilter : undefined,
        city: cityFilter || undefined,
        ...dateRange,
      });
      toast.success("Excel file downloaded!");
    } catch {
      toast.error("Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Doctors</h1>
          <p className="text-muted-foreground text-sm">
            {data?.total ? `${data.total.toLocaleString()} doctors` : "All doctors"} enrolled in the campaign.
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} className="bg-green-700 hover:bg-green-800 text-white flex-shrink-0">
          {isExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting…</> : <><FileSpreadsheet className="h-4 w-4 mr-2" />Export Doctors</>}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name…" className="pl-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Input placeholder="City…" className="w-[120px]" value={cityFilter}
              onChange={e => { setCity(e.target.value); setPage(1); }} />
            <Select value={datePreset} onValueChange={v => { setDatePreset(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={langFilter} onValueChange={v => { setLangFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={v => { setManager(v); setPage(1); }}>
              <SelectTrigger className="w-[155px]"><SelectValue placeholder="All Managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {managers.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[125px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Generated</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Doctor Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Specialty</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden sm:table-cell">Language</TableHead>
                  <TableHead className="hidden md:table-cell">Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Stethoscope className="h-8 w-8 opacity-30" />
                        <p>No doctors found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((doctor) => {
                    const statusCfg = VIDEO_STATUS_MAP[doctor.status] ?? VIDEO_STATUS_MAP["pending"];
                    return (
                      <TableRow key={doctor.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div>{doctor.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{doctor.specialization}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{doctor.specialization}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{doctor.city}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{doctor.language}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{(doctor as any).managerName ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${statusCfg.cls}`}>{statusCfg.label}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(doctor.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.total > limit && (
            <div className="p-4 border-t flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data.total.toLocaleString()} total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
