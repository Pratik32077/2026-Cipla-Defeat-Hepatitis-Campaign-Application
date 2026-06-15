import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, Video, Loader2, Target, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const GLOBAL_TARGET = 7055;

export default function AdminDashboard() {
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

  const added     = stats.totalDoctorsAdded ?? 0;
  const remaining = Math.max(0, GLOBAL_TARGET - added);
  const progress  = Math.min(100, parseFloat(((added / GLOBAL_TARGET) * 100).toFixed(1)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Global campaign overview across all managers and regions.</p>
      </div>

      {/* Overall progress */}
      <Card className="border-[#7A1512]/20">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">Overall Campaign Progress</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: 83 managers × 85 doctors = {GLOBAL_TARGET.toLocaleString()} doctors
              </p>
            </div>
            <span className="text-2xl font-bold text-[#7A1512]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {added.toLocaleString()} enrolled &nbsp;·&nbsp; {remaining.toLocaleString()} remaining
          </p>
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Total Target"
          value={GLOBAL_TARGET.toLocaleString()}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          sub="83 managers × 85"
        />
        <StatCard
          title="Doctors Enrolled"
          value={added.toLocaleString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          sub={`${remaining.toLocaleString()} remaining`}
          highlight={added > 0}
        />
        <StatCard
          title="Active Managers"
          value={stats.activeManagers ?? 0}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          sub={`of ${stats.totalManagers ?? 0} total`}
          highlight
        />
        <StatCard
          title="Videos Generated"
          value={stats.videosGenerated ?? 0}
          icon={<Video className="h-4 w-4 text-muted-foreground" />}
          sub={`${stats.pendingVideos ?? 0} pending`}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard
          title="Pending Videos"
          value={stats.pendingVideos ?? 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          sub="Awaiting generation"
          wide
        />
        <StatCard
          title="Failed Videos"
          value={stats.failedVideos ?? 0}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          sub={stats.failedVideos ? "Need attention" : "All clear"}
          warn={!!stats.failedVideos && stats.failedVideos > 0}
          wide
        />
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, sub, highlight, warn, wide,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
  wide?: boolean;
}) {
  return (
    <Card className={`${warn ? "border-red-200" : ""} ${wide ? "col-span-1" : ""}`}>
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
