import { useState } from "react";
import { useListDoctors, useListVideos, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Download, PlayCircle, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportManagerDoctors } from "@/lib/export-excel";
import { useAuth } from "@/hooks/use-auth";

const VIDEO_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  completed:  { label: "Generated",  cls: "bg-green-100 text-green-800 border-green-200" },
  failed:     { label: "Failed",     cls: "bg-red-100 text-red-800 border-red-200" },
};

const DATE_PRESETS = [
  { label: "All Doctors",  value: "all" },
  { label: "Today",        value: "today" },
  { label: "Yesterday",    value: "yesterday" },
  { label: "This Week",    value: "week" },
  { label: "This Month",   value: "month" },
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

export default function ManagerDoctors() {
  const { user } = useAuth();
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [langFilter, setLangFilter] = useState("all");
  const [statusFilter, setStatus]   = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const limit = 10;

  const dateRange = getDateRange(datePreset);
  const params: Record<string, any> = { page, limit };
  if (search)               params.search   = search;
  if (langFilter !== "all") params.language = langFilter;
  if (statusFilter !== "all") params.status = statusFilter;
  if (dateRange.dateFrom)   params.dateFrom = dateRange.dateFrom;
  if (dateRange.dateTo)     params.dateTo   = dateRange.dateTo;

  const { data, isLoading } = useListDoctors(params, { query: { queryKey: getListDoctorsQueryKey(params) } });
  const { data: videosData } = useListVideos({ limit: 1000 });

  const videoMap = new Map<number, { status: string; videoUrl?: string | null }>();
  videosData?.data?.forEach((v: any) => videoMap.set(v.doctorId, { status: v.status, videoUrl: v.videoUrl }));

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportManagerDoctors(user?.name ?? "Manager", {
        search: search || undefined,
        language: langFilter !== "all" ? langFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Doctors</h1>
          <p className="text-muted-foreground text-sm">All doctors you have registered for the campaign.</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} className="bg-green-700 hover:bg-green-800 text-white flex-shrink-0">
          {isExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting…</> : <><FileSpreadsheet className="h-4 w-4 mr-2" />Export Excel</>}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search doctors…" className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={datePreset} onValueChange={v => { setDatePreset(v); setPage(1); }}>
              <SelectTrigger className="w-[145px]"><SelectValue /></SelectTrigger>
              <SelectContent>{DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={langFilter} onValueChange={v => { setLangFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {["Hindi","English","Marathi","Gujarati","Telugu","Tamil","Punjabi","Oriya","Malayalam","Kannada","Bengali","Assamese"].map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Generated</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-xs text-muted-foreground ml-auto">{data.total} record{data.total !== 1 ? "s" : ""}</span>}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Specialty</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden sm:table-cell">Language</TableHead>
                  <TableHead>Video Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No doctors found.</TableCell></TableRow>
                ) : (
                  data?.data.map((doctor) => {
                    const vid = videoMap.get(doctor.id as number);
                    const vidStatus = vid?.status ?? doctor.status ?? "pending";
                    const vidUrl = vid?.videoUrl;
                    const statusCfg = VIDEO_STATUS_MAP[vidStatus] ?? VIDEO_STATUS_MAP["pending"];
                    const canPreview = vidStatus === "completed" && !!vidUrl;
                    return (
                      <TableRow key={doctor.id}>
                        <TableCell className="font-medium">
                          <div>{doctor.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{doctor.specialization}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{doctor.specialization}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{doctor.city}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{doctor.language}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(doctor.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canPreview && (
                              <>
                                <Button variant="ghost" size="icon" title="Review Video"
                                  onClick={() => { setPreviewUrl(vidUrl!); setPreviewName(doctor.name); }}>
                                  <PlayCircle className="h-4 w-4 text-[#7A1512]" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Download Video" asChild>
                                  <a href={vidUrl!} download><Download className="h-4 w-4 text-[#7A1512]" /></a>
                                </Button>
                              </>
                            )}
                          </div>
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
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
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

      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) setPreviewUrl(null); }}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Video Preview</DialogTitle>
            <DialogDescription className="text-sm">{previewName}</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <>
              <div className="rounded-xl overflow-hidden bg-black">
                <video key={previewUrl} controls autoPlay playsInline className="w-full object-contain" style={{ maxHeight: "70vh", aspectRatio: "9/16" }}>
                  <source src={previewUrl} type="video/mp4" />
                </video>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <a href={previewUrl} download><Download className="w-4 h-4 mr-2" />Download Video</a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
