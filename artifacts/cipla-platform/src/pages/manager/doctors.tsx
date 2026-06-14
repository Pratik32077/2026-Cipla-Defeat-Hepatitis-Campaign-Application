import { useState } from "react";
import { useListDoctors, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Download, PlayCircle } from "lucide-react";
import { format } from "date-fns";

export default function ManagerDoctors() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useListDoctors(
    { page, limit, search },
    { query: { queryKey: getListDoctorsQueryKey({ page, limit, search }) } }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Doctors</h1>
        <p className="text-muted-foreground">Manage your registered doctors and their videos.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Location & Contact</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Video Status</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No doctors found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>
                      <div className="text-sm">{doctor.city}</div>
                      <div className="text-xs text-muted-foreground">{doctor.contactNumber}</div>
                    </TableCell>
                    <TableCell>{doctor.language}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(doctor.status)}>
                        {doctor.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doctor.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {doctor.status === 'completed' && (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Preview">
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.total > limit && (
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to Math.min(page * limit, {data.total}) of {data.total} doctors
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= data.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
