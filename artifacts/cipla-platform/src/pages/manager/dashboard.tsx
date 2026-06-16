import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, Video, Loader2, Target, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";

const MANAGER_TARGET = 70;

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const target    = MANAGER_TARGET;
  const added     = stats.totalDoctorsAdded ?? 0;
  const remaining = Math.max(0, target - added);
  const progress  = Math.min(100, Math.round((added / target) * 100));
  const generated = stats.videosGenerated ?? 0;
  const pending   = stats.pendingVideos ?? 0;
  const failed    = stats.failedVideos ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, <strong>{user?.name}</strong>. Here's your campaign performance.
        </p>
      </div>

      {/* Progress bar summary */}
      <Card className="border-[#7A1512]/20">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Campaign Progress</span>
            <span className="text-sm font-bold text-[#7A1512]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {added} of {target} doctors enrolled &nbsp;·&nbsp; {remaining} remaining
          </p>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <StatCard
          title="Target Doctors"
          value={target}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          sub="Per manager target"
        />
        <StatCard
          title="Doctors Added"
          value={added}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          sub={`${remaining} remaining`}
          highlight={added > 0}
        />
        <StatCard
          title="Remaining"
          value={remaining}
          icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />}
          sub={remaining === 0 ? "Target reached! 🎉" : `${progress}% complete`}
          highlight={remaining === 0}
        />
        <StatCard
          title="Videos Generated"
          value={generated}
          icon={<Video className="h-4 w-4 text-muted-foreground" />}
          sub={`of ${added} doctors`}
          highlight={generated > 0}
        />
        <StatCard
          title="Pending Videos"
          value={pending}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          sub="Awaiting generation"
        />
        <StatCard
          title="Failed Videos"
          value={failed}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          sub={failed > 0 ? "Need attention" : "All clear"}
          warn={failed > 0}
        />
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, sub, highlight, warn,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className={warn ? "border-red-200" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-[#7A1512]" : warn ? "text-red-600" : ""}`}>
          {value}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
