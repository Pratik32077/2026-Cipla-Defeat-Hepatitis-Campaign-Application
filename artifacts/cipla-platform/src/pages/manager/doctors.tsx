import { useState } from "react";
import { useListDoctors, useListVideos, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Download, PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

const VIDEO_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  completed:  { label: "Generated",  cls: "bg-green-100 text-green-800 border-green-200" },
  failed:     { label: "Failed",     cls: "bg-red-100 text-red-800 border-red-200" },
  uploaded:   { label: "Uploaded",   cls: "bg-purple-100 text-purple-800 border-purple-200" },
  submitted:  { label: "Submitted",  cls: "bg-teal-100 text-teal-800 border-teal-200" },
};

export default function ManagerDoctors() {
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const limit = 10;

  const { data, isLoading } = useListDoctors(
    { page, limit, search },
    { query: { queryKey: getListDoctorsQueryKey({ page, limit, search }) } }
  );

  const { data: videosData } = useListVideos({ limit: 1000 });

  const videoMap = new Map<number, { status: string; videoUrl?: string | null }>();
  videosData?.data?.forEach((v: any) => {
    videoMap.set(v.doctorId, { status: v.status, videoUrl: v.videoUrl });
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  function openPreview(url: string, name: string) {
    setPreviewUrl(url);
    setPreviewName(name);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Doctors</h1>
        <p className="text-muted-foreground text-sm">All doctors you have registered for the campaign.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Search bar */}
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors…"
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {data && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {data.total} doctor{data.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Specialization</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Language</TableHead>
                  <TableHead>Video Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No doctors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((doctor) => {
                    const vid = videoMap.get(doctor.id as number);
                    const vidStatus = vid?.status ?? doctor.status ?? "pending";
                    const vidUrl    = vid?.videoUrl;
                    const statusCfg = VIDEO_STATUS_MAP[vidStatus] ?? VIDEO_STATUS_MAP["pending"];
                    const canPreview = vidStatus === "completed" && !!vidUrl;
                    return (
                      <TableRow key={doctor.id}>
                        <TableCell className="font-medium">
                          <div>{doctor.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{doctor.specialization}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{doctor.specialization}</TableCell>
                        <TableCell className="hidden md:table-cell">{doctor.city}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{doctor.contactNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">{doctor.language}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(doctor.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canPreview && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Preview Video"
                                  onClick={() => openPreview(vidUrl!, doctor.name)}
                                >
                                  <PlayCircle className="h-4 w-4 text-[#7A1512]" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Download Video" asChild>
                                  <a href={vidUrl!} download>
                                    <Download className="h-4 w-4 text-[#7A1512]" />
                                  </a>
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

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} &nbsp;·&nbsp; {data.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) setPreviewUrl(null); }}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Video Preview</DialogTitle>
            <DialogDescription className="text-sm">{previewName}</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="rounded-xl overflow-hidden bg-black">
              <video key={previewUrl} controls autoPlay playsInline
                className="w-full object-contain"
                style={{ maxHeight: "70vh", aspectRatio: "9/16" }}>
                <source src={previewUrl} type="video/mp4" />
              </video>
            </div>
          )}
          {previewUrl && (
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <a href={previewUrl} download>
                <Download className="w-4 h-4 mr-2" /> Download Video
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
