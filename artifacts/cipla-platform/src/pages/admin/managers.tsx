import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListManagers, useCreateManager, useUpdateManager, useDeleteManager,
  useToggleManagerStatus, getListManagersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, UserCheck, UserX, Users, Filter,
  FileSpreadsheet, Download,
} from "lucide-react";
import { exportAllManagers, exportSingleManager } from "@/lib/export-excel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REGIONS = [
  "Ahmedabad", "Mumbai", "Indore", "Pune", "Delhi", "Ambala/Haryana",
  "Ghaziabad", "Bihar", "Kolkata", "Ludhiana", "Hyderabad",
  "Bangalore", "Chennai", "Cochin", "Other",
];

const addSchema = z.object({
  name: z.string().min(2, "Name required"),
  employeeCode: z.string().min(3, "Employee code required"),
  email: z.string().email("Valid email required"),
  mobile: z.string().min(10, "Valid mobile required"),
  region: z.string().min(1, "Region required"),
  headquarters: z.string().min(1, "HQ required"),
  username: z.string().min(3, "Username required"),
  password: z.string().min(6, "Min 6 characters"),
  targetDoctors: z.coerce.number().min(1, "Target required"),
});

const editSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  region: z.string().min(1),
  headquarters: z.string().min(1),
  targetDoctors: z.coerce.number().min(1),
});

type Manager = {
  id: number;
  name: string;
  employeeCode: string;
  email: string;
  mobile: string;
  region: string;
  headquarters: string;
  username: string;
  isActive: boolean;
  targetDoctors: number;
  createdAt: string;
};

export default function AdminManagers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Manager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const limit = 20;

  const params: Record<string, any> = { page, limit };
  if (search) params.search = search;
  if (regionFilter && regionFilter !== "all") params.region = regionFilter;
  if (statusFilter && statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useListManagers(params, {
    query: { queryKey: getListManagersQueryKey(params) },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["listManagers"] });
  };

  const createManager = useCreateManager({
    mutation: {
      onSuccess: () => { toast.success("Manager added successfully"); setAddOpen(false); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error || "Failed to add manager"),
    },
  });

  const updateManager = useUpdateManager({
    mutation: {
      onSuccess: () => { toast.success("Manager updated"); setEditTarget(null); invalidate(); },
      onError: () => toast.error("Failed to update manager"),
    },
  });

  const deleteManager = useDeleteManager({
    mutation: {
      onSuccess: () => { toast.success("Manager deleted"); setDeleteTarget(null); invalidate(); },
      onError: () => toast.error("Failed to delete manager"),
    },
  });

  const toggleStatus = useToggleManagerStatus({
    mutation: {
      onSuccess: (_, vars) => {
        toast.success("Status updated");
        invalidate();
      },
      onError: () => toast.error("Failed to toggle status"),
    },
  });

  const addForm = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      name: "", employeeCode: "", email: "", mobile: "",
      region: "", headquarters: "", username: "", password: "", targetDoctors: 84,
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", mobile: "", region: "", headquarters: "", targetDoctors: 84 },
  });

  function openEdit(m: Manager) {
    setEditTarget(m);
    editForm.reset({
      name: m.name, email: m.email, mobile: m.mobile,
      region: m.region, headquarters: m.headquarters, targetDoctors: m.targetDoctors,
    });
  }

  async function handleExportAll() {
    setIsExporting(true);
    try {
      await exportAllManagers();
      toast.success("All managers exported successfully!");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportSingle(m: Manager) {
    setExportingId(m.id);
    try {
      await exportSingleManager(m.id, m.name);
      toast.success(`${m.name}'s data exported!`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExportingId(null);
    }
  }

  function onAddSubmit(values: z.infer<typeof addSchema>) {
    createManager.mutate({ data: values });
  }

  function onEditSubmit(values: z.infer<typeof editSchema>) {
    if (!editTarget) return;
    updateManager.mutate({ id: editTarget.id, data: values });
  }

  const managers: Manager[] = (data?.data as any) ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Managers</h1>
          <p className="text-muted-foreground text-sm">Manage field executives and their doctor targets.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            {isExporting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting…</>
              : <><FileSpreadsheet className="mr-2 h-4 w-4" /> Export All Managers</>
            }
          </Button>
          <Button
            onClick={() => { addForm.reset(); setAddOpen(true); }}
            className="bg-[#7A1512] hover:bg-[#5a0f0d] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Manager
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Managers</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{managers.filter(m => m.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><UserX className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{managers.filter(m => !m.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={regionFilter} onValueChange={v => { setRegionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Roster ({total} total)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : managers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-40" />
              <p>No managers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Emp Code</TableHead>
                    <TableHead className="font-semibold">Region</TableHead>
                    <TableHead className="font-semibold">HQ</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="font-semibold">Target</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{m.employeeCode}</span>
                      </TableCell>
                      <TableCell className="text-sm">{m.region}</TableCell>
                      <TableCell className="text-sm">{m.headquarters}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{m.email}</TableCell>
                      <TableCell className="text-sm font-mono">{m.mobile}</TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-[#7A1512]">{m.targetDoctors}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.isActive ? "default" : "secondary"} className={m.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                          {m.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Export Manager Data"
                            onClick={() => handleExportSingle(m)}
                            disabled={exportingId === m.id}
                            className="h-8 w-8"
                          >
                            {exportingId === m.id
                              ? <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                              : <Download className="h-4 w-4 text-green-600" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={m.isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatus.mutate({ id: m.id })}
                            className="h-8 w-8"
                          >
                            {m.isActive
                              ? <ToggleRight className="h-4 w-4 text-green-600" />
                              : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(m)} className="h-8 w-8">
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleteTarget(m)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center text-sm px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Manager Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Manager</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField control={addForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="Harshkumar Patel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={addForm.control} name="employeeCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code *</FormLabel>
                    <FormControl><Input placeholder="154173" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Login ID) *</FormLabel>
                    <FormControl><Input placeholder="154173" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={addForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl><Input type="email" placeholder="name@Cipla.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={addForm.control} name="mobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile *</FormLabel>
                  <FormControl><Input placeholder="9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={addForm.control} name="region" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="headquarters" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headquarters *</FormLabel>
                    <FormControl><Input placeholder="Ahmedabad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={addForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl><Input type="password" placeholder="Min 6 characters" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="targetDoctors" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Doctors *</FormLabel>
                    <FormControl><Input type="number" placeholder="84" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createManager.isPending} className="bg-[#7A1512] hover:bg-[#5a0f0d] text-white">
                  {createManager.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Manager
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Manager Dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => !v && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Manager — {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="mobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="region" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="headquarters" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headquarters *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="targetDoctors" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Doctors *</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={updateManager.isPending} className="bg-[#7A1512] hover:bg-[#5a0f0d] text-white">
                  {updateManager.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.employeeCode})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteManager.mutate({ id: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
