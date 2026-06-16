import { useState } from "react";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetLeaderboard, useGetLanguageDistribution,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, Video, Loader2, Target, TrendingUp, Clock, AlertCircle, FileSpreadsheet, Trophy, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportDashboardReport } from "@/lib/export-excel";

const GLOBAL_TARGET = 5810;

export default function AdminDashboard() {
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: leaderboard } = useGetLeaderboard();
  const { data: langDist }    = useGetLanguageDistribution();

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

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportDashboardReport();
      toast.success("Dashboard report downloaded!");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Global campaign overview across all managers and regions.</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-green-700 hover:bg-green-800 text-white flex-shrink-0"
        >
          {isExporting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting…</>
            : <><FileSpreadsheet className="h-4 w-4 mr-2" /> Export Dashboard Report</>
          }
        </Button>
      </div>

      {/* Overall progress */}
      <Card className="border-[#7A1512]/20">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">Overall Campaign Progress</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: 83 managers × 70 doctors = {GLOBAL_TARGET.toLocaleString()} doctors
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
        <StatCard title="Total Target"       value={GLOBAL_TARGET.toLocaleString()} icon={<Target className="h-4 w-4 text-muted-foreground" />} sub="83 managers × 70" />
        <StatCard title="Doctors Enrolled"   value={added.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} sub={`${remaining.toLocaleString()} remaining`} highlight />
        <StatCard title="Active Managers"    value={stats.activeManagers ?? 0} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} sub={`of ${stats.totalManagers ?? 0} total`} highlight />
        <StatCard title="Videos Generated"   value={stats.videosGenerated ?? 0} icon={<Video className="h-4 w-4 text-muted-foreground" />} sub={`${stats.pendingVideos ?? 0} pending`} />
        <StatCard title="Today's Enrolments" value={stats.todayDoctorsAdded ?? 0} icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />} sub="Added today" highlight={(stats.todayDoctorsAdded ?? 0) > 0} />
        <StatCard title="Today's Videos"     value={stats.todayVideosGenerated ?? 0} icon={<Video className="h-4 w-4 text-muted-foreground" />} sub="Generated today" />
        <StatCard title="Pending Videos"     value={stats.pendingVideos ?? 0} icon={<Clock className="h-4 w-4 text-muted-foreground" />} sub="Awaiting generation" />
        <StatCard title="Failed Videos"      value={stats.failedVideos ?? 0} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} sub={stats.failedVideos ? "Need attention" : "All clear"} warn={!!stats.failedVideos && stats.failedVideos > 0} />
      </div>

      {/* Leaderboard + Language */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-base">Top Performers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(leaderboard as any)?.topPerformers?.slice(0, 5).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                    i === 1 ? "bg-gray-100 text-gray-700" :
                    i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{e.managerName}</p>
                    <p className="text-xs text-muted-foreground">{e.region}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#7A1512]">{e.doctorsAdded}</p>
                  <p className="text-xs text-muted-foreground">{e.progressPercent}%</p>
                </div>
              </div>
            )) ?? <p className="text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-base">Language Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Array.isArray(langDist) ? langDist : []).slice(0, 8).map((l: any) => (
              <div key={l.label} className="flex items-center gap-3">
                <span className="text-sm w-20 flex-shrink-0">{l.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7A1512] rounded-full"
                    style={{ width: `${Math.min(100, (l.count / (added || 1)) * 100)}%` }}
                  />
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">{l.count}</Badge>
              </div>
            )) ?? null}
            {(!langDist || (Array.isArray(langDist) && langDist.length === 0)) && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, sub, highlight, warn }: {
  title: string; value: number | string; icon: React.ReactNode;
  sub?: string; highlight?: boolean; warn?: boolean;
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
