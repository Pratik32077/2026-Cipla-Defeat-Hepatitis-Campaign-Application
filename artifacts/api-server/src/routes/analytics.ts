import { Router } from "express";
import { db } from "@workspace/db";
import { doctorsTable, managersTable, videosTable, auditLogsTable } from "@workspace/db";
import { eq, count, sql, gte, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/dashboard", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalDoctors,
    totalManagers,
    activeManagers,
    videoStats,
    todayDoctors,
    todayVideos,
  ] = await Promise.all([
    db.select({ count: count() }).from(doctorsTable),
    db.select({ count: count() }).from(managersTable),
    db.select({ count: count() }).from(managersTable).where(eq(managersTable.isActive, true)),
    db.select({
      generated: sql<number>`count(*) filter (where ${videosTable.status} = 'completed')`,
      pending: sql<number>`count(*) filter (where ${videosTable.status} = 'pending')`,
      failed: sql<number>`count(*) filter (where ${videosTable.status} = 'failed')`,
    }).from(videosTable),
    db.select({ count: count() }).from(doctorsTable).where(gte(doctorsTable.createdAt, today)),
    db.select({ count: count() }).from(videosTable)
      .where(and(eq(videosTable.status, "completed"), gte(videosTable.createdAt, today))),
  ]);

  const totalTarget = 7000;
  const added = totalDoctors[0].count;
  const remaining = Math.max(0, totalTarget - added);
  const progressPercent = Math.round((added / totalTarget) * 100);

  // Today's top performer
  let todayTopPerformer: string | null = null;
  const topToday = await db.select({
    managerId: doctorsTable.managerId,
    cnt: count(),
  }).from(doctorsTable)
    .where(gte(doctorsTable.createdAt, today))
    .groupBy(doctorsTable.managerId)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  if (topToday.length > 0) {
    const [mgr] = await db.select().from(managersTable).where(eq(managersTable.id, topToday[0].managerId));
    todayTopPerformer = mgr?.name ?? null;
  }

  res.json({
    totalTargetDoctors: totalTarget,
    totalDoctorsAdded: added,
    remainingDoctors: remaining,
    overallProgressPercent: progressPercent,
    totalManagers: totalManagers[0].count,
    activeManagers: activeManagers[0].count,
    videosGenerated: Number(videoStats[0].generated),
    pendingVideos: Number(videoStats[0].pending),
    failedVideos: Number(videoStats[0].failed),
    todayDoctorsAdded: todayDoctors[0].count,
    todayVideosGenerated: todayVideos[0].count,
    todayActiveManagers: 0,
    todayTopPerformer,
  });
});

router.get("/leaderboard", async (req, res) => {
  const stats = await db.select({
    managerId: doctorsTable.managerId,
    doctorsAdded: count(),
  }).from(doctorsTable).groupBy(doctorsTable.managerId).orderBy(sql`count(*) desc`);

  const managers = await db.select().from(managersTable);
  const managerMap = new Map(managers.map(m => [m.id, m]));

  const entries = stats.map(s => {
    const mgr = managerMap.get(s.managerId);
    return {
      managerId: s.managerId,
      managerName: mgr?.name ?? "Unknown",
      region: mgr?.region ?? "",
      doctorsAdded: s.doctorsAdded,
      target: mgr?.targetDoctors ?? 100,
      progressPercent: mgr ? Math.round((s.doctorsAdded / mgr.targetDoctors) * 100) : 0,
    };
  });

  res.json({
    topPerformers: entries.slice(0, 5),
    lowestPerformers: [...entries].reverse().slice(0, 5),
  });
});

router.get("/language-distribution", async (req, res) => {
  const result = await db.select({
    label: doctorsTable.language,
    count: count(),
  }).from(doctorsTable).groupBy(doctorsTable.language).orderBy(sql`count(*) desc`);

  res.json(result.map(r => ({ label: r.label, count: r.count })));
});

router.get("/daily-trend", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await db.select({
    date: sql<string>`date_trunc('day', ${doctorsTable.createdAt})::date::text`,
    count: count(),
  }).from(doctorsTable)
    .where(gte(doctorsTable.createdAt, since))
    .groupBy(sql`date_trunc('day', ${doctorsTable.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${doctorsTable.createdAt})::date`);

  res.json(result.map(r => ({ date: r.date, count: r.count })));
});

router.get("/manager-stats", async (req, res) => {
  const managers = await db.select().from(managersTable);

  const stats = await db.select({
    managerId: doctorsTable.managerId,
    doctorsAdded: count(),
  }).from(doctorsTable).groupBy(doctorsTable.managerId);

  const videoStats = await db.select({
    managerId: videosTable.managerId,
    generated: sql<number>`count(*) filter (where ${videosTable.status} = 'completed')`,
    pending: sql<number>`count(*) filter (where ${videosTable.status} = 'pending')`,
  }).from(videosTable).groupBy(videosTable.managerId);

  const statMap = new Map(stats.map(s => [s.managerId, s.doctorsAdded]));
  const videoMap = new Map(videoStats.map(v => [v.managerId, v]));

  const result = managers.map(m => {
    const added = statMap.get(m.id) ?? 0;
    const vs = videoMap.get(m.id);
    return {
      managerId: m.id,
      managerName: m.name,
      region: m.region,
      doctorsAdded: added,
      target: m.targetDoctors,
      videosGenerated: Number(vs?.generated ?? 0),
      pendingVideos: Number(vs?.pending ?? 0),
      progressPercent: m.targetDoctors > 0 ? Math.round((added / m.targetDoctors) * 100) : 0,
    };
  });

  res.json(result);
});

export default router;
