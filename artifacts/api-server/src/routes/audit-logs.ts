import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const [logs, totalResult] = await Promise.all([
    db.select().from(auditLogsTable)
      .orderBy(auditLogsTable.createdAt)
      .limit(limit).offset(offset),
    db.select({ count: count() }).from(auditLogsTable),
  ]);

  res.json({
    data: logs.map(l => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      userRole: l.userRole,
      userName: l.userName,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
    total: totalResult[0].count,
    page,
    limit,
  });
});

export default router;
