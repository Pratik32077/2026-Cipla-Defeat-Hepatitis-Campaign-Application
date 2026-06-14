import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, managersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/login", async (req, res) => {
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { username, password } = parse.data;

  // Try admin first
  const admin = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (admin.length > 0) {
    const valid = await bcrypt.compare(password, admin[0].passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: admin[0].id, role: "admin", name: admin[0].name });
    await db.insert(auditLogsTable).values({
      action: "Admin Logged In",
      userId: admin[0].id,
      userRole: "admin",
      userName: admin[0].name,
      details: `Admin ${admin[0].name} logged in`,
    });
    res.json({
      token,
      user: { id: admin[0].id, name: admin[0].name, role: "admin", employeeCode: null, region: null, headquarters: null, targetDoctors: null },
    });
    return;
  }

  // Try manager
  const manager = await db.select().from(managersTable).where(eq(managersTable.username, username)).limit(1);
  if (manager.length > 0) {
    if (!manager[0].isActive) {
      res.status(401).json({ error: "Account is deactivated. Contact admin." });
      return;
    }
    const valid = await bcrypt.compare(password, manager[0].passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: manager[0].id, role: "manager", name: manager[0].name });
    await db.insert(auditLogsTable).values({
      action: "Manager Logged In",
      userId: manager[0].id,
      userRole: "manager",
      userName: manager[0].name,
      details: `Manager ${manager[0].name} logged in`,
    });
    res.json({
      token,
      user: {
        id: manager[0].id,
        name: manager[0].name,
        role: "manager",
        employeeCode: manager[0].employeeCode,
        region: manager[0].region,
        headquarters: manager[0].headquarters,
        targetDoctors: manager[0].targetDoctors,
      },
    });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role === "admin") {
    const admin = await db.select().from(adminsTable).where(eq(adminsTable.id, user.id)).limit(1);
    if (!admin.length) { res.status(401).json({ error: "Not found" }); return; }
    res.json({ id: admin[0].id, name: admin[0].name, role: "admin", employeeCode: null, region: null, headquarters: null, targetDoctors: null });
  } else {
    const manager = await db.select().from(managersTable).where(eq(managersTable.id, user.id)).limit(1);
    if (!manager.length) { res.status(401).json({ error: "Not found" }); return; }
    res.json({
      id: manager[0].id,
      name: manager[0].name,
      role: "manager",
      employeeCode: manager[0].employeeCode,
      region: manager[0].region,
      headquarters: manager[0].headquarters,
      targetDoctors: manager[0].targetDoctors,
    });
  }
});

export default router;
