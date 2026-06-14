import { useListManagers, getListManagersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminManagers() {
  const { data, isLoading } = useListManagers({}, {
    query: {
      queryKey: getListManagersQueryKey({}),
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Managers</h1>
        <p className="text-muted-foreground">Manage field executives and their targets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manager Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Loaded {data?.total ?? 0} managers. Table implementation pending.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
