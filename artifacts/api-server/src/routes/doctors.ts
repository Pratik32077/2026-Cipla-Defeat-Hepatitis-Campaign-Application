import { Router } from "express";
import { db } from "@workspace/db";
import { doctorsTable, managersTable, videosTable, auditLogsTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateDoctorBody, UpdateDoctorBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const language = req.query.language as string;
  const city = req.query.city as string;
  const status = req.query.status as string;
  const managerIdParam = req.query.managerId as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (req.user!.role === "manager") {
    conditions.push(eq(doctorsTable.managerId, req.user!.id));
  } else if (managerIdParam) {
    conditions.push(eq(doctorsTable.managerId, parseInt(managerIdParam)));
  }

  if (search) {
    conditions.push(ilike(doctorsTable.name, `%${search}%`));
  }
  if (language) conditions.push(eq(doctorsTable.language, language));
  if (city) conditions.push(ilike(doctorsTable.city, `%${city}%`));
  if (status) conditions.push(eq(doctorsTable.status, status));
  if (dateFrom) conditions.push(gte(doctorsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(doctorsTable.createdAt, new Date(dateTo)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [doctors, totalResult] = await Promise.all([
    db.select({
      id: doctorsTable.id,
      name: doctorsTable.name,
      specialization: doctorsTable.specialization,
      city: doctorsTable.city,
      language: doctorsTable.language,
      imageUrl: doctorsTable.imageUrl,
      status: doctorsTable.status,
      managerId: doctorsTable.managerId,
      managerName: managersTable.name,
      createdAt: doctorsTable.createdAt,
      updatedAt: doctorsTable.updatedAt,
    })
      .from(doctorsTable)
      .leftJoin(managersTable, eq(doctorsTable.managerId, managersTable.id))
      .where(whereClause)
      .limit(limit).offset(offset)
      .orderBy(doctorsTable.createdAt),
    db.select({ count: count() }).from(doctorsTable).where(whereClause),
  ]);

  res.json({
    data: doctors.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/", async (req, res) => {
  if (req.user!.role !== "manager") {
    res.status(403).json({ error: "Only managers can add doctors" });
    return;
  }
  const parse = CreateDoctorBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.issues });
    return;
  }

  const [doctor] = await db.insert(doctorsTable).values({
    ...parse.data,
    managerId: req.user!.id,
    status: "pending",
  }).returning();

  await db.insert(videosTable).values({
    doctorId: doctor.id,
    managerId: req.user!.id,
    status: "pending",
  });

  await db.insert(auditLogsTable).values({
    action: "Manager Added Doctor",
    userId: req.user!.id, userRole: "manager", userName: req.user!.name,
    details: `Added doctor ${doctor.name} (${doctor.specialization})`,
  });

  res.status(201).json({
    id: doctor.id, name: doctor.name, specialization: doctor.specialization,
    city: doctor.city, language: doctor.language,
    imageUrl: doctor.imageUrl, status: doctor.status, managerId: doctor.managerId,
    managerName: req.user!.name,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [doctor] = await db.select({
    id: doctorsTable.id,
    name: doctorsTable.name,
    specialization: doctorsTable.specialization,
    city: doctorsTable.city,
    language: doctorsTable.language,
    imageUrl: doctorsTable.imageUrl,
    status: doctorsTable.status,
    managerId: doctorsTable.managerId,
    managerName: managersTable.name,
    createdAt: doctorsTable.createdAt,
    updatedAt: doctorsTable.updatedAt,
  })
    .from(doctorsTable)
    .leftJoin(managersTable, eq(doctorsTable.managerId, managersTable.id))
    .where(eq(doctorsTable.id, id));

  if (!doctor) { res.status(404).json({ error: "Not found" }); return; }
  if (req.user!.role === "manager" && doctor.managerId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  res.json({ ...doctor, createdAt: doctor.createdAt.toISOString(), updatedAt: doctor.updatedAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parse = UpdateDoctorBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [existing] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (req.user!.role === "manager" && existing.managerId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const [doctor] = await db.update(doctorsTable)
    .set({ ...parse.data, updatedAt: new Date() })
    .where(eq(doctorsTable.id, id)).returning();

  await db.insert(auditLogsTable).values({
    action: "Manager Edited Doctor",
    userId: req.user!.id, userRole: req.user!.role, userName: req.user!.name,
    details: `Updated doctor ${doctor.name}`,
  });

  const [managerRow] = await db.select().from(managersTable).where(eq(managersTable.id, doctor.managerId));
  res.json({
    ...doctor,
    managerName: managerRow?.name ?? null,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  });
});

export default router;
