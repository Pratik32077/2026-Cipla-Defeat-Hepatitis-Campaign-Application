import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable, doctorsTable, managersTable, auditLogsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateVideo, listAvailableLanguages, getMasterVideoPath } from "../lib/video-generator";

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

// Check video generator health (which master videos are available)
router.get("/generator-status", async (req, res) => {
  const available = listAvailableLanguages();
  res.json({
    ready: available.length > 0,
    availableLanguages: available,
  });
});

// Generate a video preview — no DB record needed, returns a temp video URL
router.post("/generate-preview", async (req, res) => {
  const { doctorName, designation, language, imageBase64 } = req.body;

  if (!doctorName || !designation || !language || !imageBase64) {
    res.status(400).json({ error: "doctorName, designation, language, and imageBase64 are required." });
    return;
  }

  const masterPath = getMasterVideoPath(language.toLowerCase());
  if (!masterPath) {
    res.status(503).json({
      error: `Master video not configured for language "${language}". Please upload the language master video to the server.`,
      code: "MASTER_VIDEO_MISSING",
    });
    return;
  }

  try {
    const result = await generateVideo({ doctorName, designation, language, imageBase64 });

    await db.insert(auditLogsTable).values({
      action: "Video Preview Generated",
      userId: req.user!.id, userRole: req.user!.role, userName: req.user!.name,
      details: `Preview video generated for ${doctorName} (${language})`,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "Video generation failed");
    res.status(500).json({ error: err.message || "Video generation failed." });
  }
});

// Trigger generation for an existing video record
router.post("/:id/generate", async (req, res) => {
  const id = parseInt(req.params.id);

  const [video] = await db.select({
    id: videosTable.id,
    doctorId: videosTable.doctorId,
    managerId: videosTable.managerId,
    status: videosTable.status,
  })
    .from(videosTable)
    .where(eq(videosTable.id, id));

  if (!video) { res.status(404).json({ error: "Video record not found" }); return; }
  if (req.user!.role === "manager" && video.managerId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const [doctor] = await db.select({
    name: doctorsTable.name,
    specialization: doctorsTable.specialization,
    language: doctorsTable.language,
    imageUrl: doctorsTable.imageUrl,
  })
    .from(doctorsTable)
    .where(eq(doctorsTable.id, video.doctorId));

  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  if (!doctor.imageUrl) { res.status(400).json({ error: "Doctor has no photo uploaded." }); return; }

  const masterPath = getMasterVideoPath(doctor.language.toLowerCase());
  if (!masterPath) {
    res.status(503).json({
      error: `Master video not configured for language "${doctor.language}".`,
      code: "MASTER_VIDEO_MISSING",
    });
    return;
  }

  await db.update(videosTable)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(videosTable.id, id));

  try {
    const result = await generateVideo({
      doctorName: doctor.name,
      designation: doctor.specialization,
      language: doctor.language,
      imageBase64: doctor.imageUrl,
    });

    await db.update(videosTable)
      .set({ status: "completed", videoUrl: result.videoUrl, updatedAt: new Date() })
      .where(eq(videosTable.id, id));

    await db.insert(auditLogsTable).values({
      action: "Video Generated",
      userId: req.user!.id, userRole: req.user!.role, userName: req.user!.name,
      details: `Video generated for doctor ${doctor.name} in ${doctor.language}`,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    await db.update(videosTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(videosTable.id, id));

    req.log.error({ err }, "Video generation failed");
    res.status(500).json({ error: err.message || "Video generation failed." });
  }
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
