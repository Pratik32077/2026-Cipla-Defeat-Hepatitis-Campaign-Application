import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable, doctorsTable, managersTable, auditLogsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const managerIdParam = req.query.managerId as string;
  const doctorIdParam = req.query.doctorId as string;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (req.user!.role === "manager") {
    conditions.push(eq(videosTable.managerId, req.user!.id));
  } else if (managerIdParam) {
    conditions.push(eq(videosTable.managerId, parseInt(managerIdParam)));
  }
  if (status) conditions.push(eq(videosTable.status, status));
  if (doctorIdParam) conditions.push(eq(videosTable.doctorId, parseInt(doctorIdParam)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [videos, totalResult] = await Promise.all([
    db.select({
      id: videosTable.id,
      doctorId: videosTable.doctorId,
      doctorName: doctorsTable.name,
      managerId: videosTable.managerId,
      managerName: managersTable.name,
      status: videosTable.status,
      videoUrl: videosTable.videoUrl,
      createdAt: videosTable.createdAt,
      updatedAt: videosTable.updatedAt,
    })
      .from(videosTable)
      .leftJoin(doctorsTable, eq(videosTable.doctorId, doctorsTable.id))
      .leftJoin(managersTable, eq(videosTable.managerId, managersTable.id))
      .where(whereClause)
      .limit(limit).offset(offset)
      .orderBy(videosTable.createdAt),
    db.select({ count: count() }).from(videosTable).where(whereClause),
  ]);

  res.json({
    data: videos.map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [video] = await db.select({
    id: videosTable.id,
    doctorId: videosTable.doctorId,
    doctorName: doctorsTable.name,
    managerId: videosTable.managerId,
    managerName: managersTable.name,
    status: videosTable.status,
    videoUrl: videosTable.videoUrl,
    createdAt: videosTable.createdAt,
    updatedAt: videosTable.updatedAt,
  })
    .from(videosTable)
    .leftJoin(doctorsTable, eq(videosTable.doctorId, doctorsTable.id))
    .leftJoin(managersTable, eq(videosTable.managerId, managersTable.id))
    .where(eq(videosTable.id, id));

  if (!video) { res.status(404).json({ error: "Not found" }); return; }
  if (req.user!.role === "manager" && video.managerId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  await db.insert(auditLogsTable).values({
    action: "Manager Downloaded Video",
    userId: req.user!.id, userRole: req.user!.role, userName: req.user!.name,
    details: `Viewed video for doctor ${video.doctorName}`,
  });

  res.json({ ...video, createdAt: video.createdAt.toISOString(), updatedAt: video.updatedAt.toISOString() });
});

export default router;
