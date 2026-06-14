import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { managersTable, doctorsTable, videosTable, auditLogsTable } from "@workspace/db";
import { eq, like, and, count, sql, ilike } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateManagerBody, UpdateManagerBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || "";
  const status = req.query.status as string;
  const region = req.query.region as string;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) conditions.push(ilike(managersTable.name, `%${search}%`));
  if (status === "active") conditions.push(eq(managersTable.isActive, true));
  if (status === "inactive") conditions.push(eq(managersTable.isActive, false));
  if (region) conditions.push(ilike(managersTable.region, `%${region}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [managers, totalResult] = await Promise.all([
    db.select().from(managersTable)
      .where(whereClause)
      .limit(limit).offset(offset)
      .orderBy(managersTable.createdAt),
    db.select({ count: count() }).from(managersTable).where(whereClause),
  ]);

  const safeManagers = managers.map(m => ({
    id: m.id,
    name: m.name,
    employeeCode: m.employeeCode,
    email: m.email,
    mobile: m.mobile,
    region: m.region,
    headquarters: m.headquarters,
    username: m.username,
    isActive: m.isActive,
    targetDoctors: m.targetDoctors,
    createdAt: m.createdAt.toISOString(),
  }));

  res.json({ data: safeManagers, total: totalResult[0].count, page, limit });
});

router.post("/", async (req, res) => {
  const parse = CreateManagerBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.issues });
    return;
  }
  const { password, ...rest } = parse.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [manager] = await db.insert(managersTable).values({ ...rest, passwordHash }).returning();
    await db.insert(auditLogsTable).values({
      action: "Manager Added",
      userId: req.user!.id,
      userRole: "admin",
      userName: req.user!.name,
      details: `Added manager ${manager.name} (${manager.employeeCode})`,
    });
    res.status(201).json({
      id: manager.id, name: manager.name, employeeCode: manager.employeeCode,
      email: manager.email, mobile: manager.mobile, region: manager.region,
      headquarters: manager.headquarters, username: manager.username,
      isActive: manager.isActive, targetDoctors: manager.targetDoctors,
      createdAt: manager.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Employee code or username already exists" });
    } else {
      res.status(500).json({ error: "Failed to create manager" });
    }
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [manager] = await db.select().from(managersTable).where(eq(managersTable.id, id));
  if (!manager) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: manager.id, name: manager.name, employeeCode: manager.employeeCode,
    email: manager.email, mobile: manager.mobile, region: manager.region,
    headquarters: manager.headquarters, username: manager.username,
    isActive: manager.isActive, targetDoctors: manager.targetDoctors,
    createdAt: manager.createdAt.toISOString(),
  });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parse = UpdateManagerBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const updates: Record<string, any> = { ...parse.data };
  const [manager] = await db.update(managersTable).set(updates).where(eq(managersTable.id, id)).returning();
  if (!manager) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({
    action: "Manager Updated",
    userId: req.user!.id, userRole: "admin", userName: req.user!.name,
    details: `Updated manager ${manager.name}`,
  });
  res.json({
    id: manager.id, name: manager.name, employeeCode: manager.employeeCode,
    email: manager.email, mobile: manager.mobile, region: manager.region,
    headquarters: manager.headquarters, username: manager.username,
    isActive: manager.isActive, targetDoctors: manager.targetDoctors,
    createdAt: manager.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [manager] = await db.delete(managersTable).where(eq(managersTable.id, id)).returning();
  if (!manager) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({
    action: "Manager Deleted",
    userId: req.user!.id, userRole: "admin", userName: req.user!.name,
    details: `Deleted manager ${manager.name} (${manager.employeeCode})`,
  });
  res.json({ message: "Deleted" });
});

router.post("/:id/toggle-status", async (req, res) => {
  const id = parseInt(req.params.id);
  const [current] = await db.select().from(managersTable).where(eq(managersTable.id, id));
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const [manager] = await db.update(managersTable).set({ isActive: !current.isActive }).where(eq(managersTable.id, id)).returning();
  await db.insert(auditLogsTable).values({
    action: manager.isActive ? "Manager Activated" : "Manager Deactivated",
    userId: req.user!.id, userRole: "admin", userName: req.user!.name,
    details: `${manager.isActive ? "Activated" : "Deactivated"} manager ${manager.name}`,
  });
  res.json({
    id: manager.id, name: manager.name, employeeCode: manager.employeeCode,
    email: manager.email, mobile: manager.mobile, region: manager.region,
    headquarters: manager.headquarters, username: manager.username,
    isActive: manager.isActive, targetDoctors: manager.targetDoctors,
    createdAt: manager.createdAt.toISOString(),
  });
});

router.get("/:id/progress", async (req, res) => {
  const id = parseInt(req.params.id);
  const [manager] = await db.select().from(managersTable).where(eq(managersTable.id, id));
  if (!manager) { res.status(404).json({ error: "Not found" }); return; }

  const [statsResult] = await db.select({
    total: count(),
    completed: sql<number>`count(*) filter (where ${doctorsTable.status} = 'completed')`,
    pending: sql<number>`count(*) filter (where ${doctorsTable.status} = 'pending')`,
    failed: sql<number>`count(*) filter (where ${doctorsTable.status} = 'failed')`,
  }).from(doctorsTable).where(eq(doctorsTable.managerId, id));

  const progressPercent = manager.targetDoctors > 0
    ? Math.round((Number(statsResult.completed) / manager.targetDoctors) * 100)
    : 0;

  res.json({
    managerId: manager.id,
    managerName: manager.name,
    target: manager.targetDoctors,
    completed: Number(statsResult.completed),
    pending: Number(statsResult.pending),
    failed: Number(statsResult.failed),
    progressPercent,
  });
});

export default router;
