ERROR
const isHashedPassword = (value: string): boolean => {
  return /^\$2[aby]\$/.test(value);
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (isHashedPassword(stored)) {
    return await bcrypt.compare(password, stored);
  }
  return password === stored;
};

const router = Router();

router.post("/login", async (req, res) => {
  try {
    logger.info({ url: req.url, method: req.method, ip: req.ip }, "Login request received");
    const parse = LoginBody.safeParse(req.body);
    if (!parse.success) {
      logger.warn({ body: req.body }, "Invalid login request payload");
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const { username, password } = parse.data;

    // Try admin first
    const admin = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
    if (admin.length > 0) {
      logger.info({ username, userId: admin[0].id }, "Admin user found");
      const valid = await verifyPassword(password, admin[0].passwordHash);
      logger.info({ username, userId: admin[0].id, valid }, "Admin password comparison result");
      if (!valid) {
        logger.warn({ username, userId: admin[0].id }, "Invalid admin credentials");
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
      logger.info({ username, userId: admin[0].id, role: "admin" }, "Admin login successful");
      res.json({
        token,
        user: { id: admin[0].id, name: admin[0].name, role: "admin", employeeCode: null, region: null, headquarters: null, targetDoctors: null },
      });
      return;
    }

    // Try manager
    const manager = await db.select().from(managersTable).where(eq(managersTable.username, username)).limit(1);
    if (manager.length > 0) {
      logger.info({ username, userId: manager[0].id }, "Manager user found");
      if (!manager[0].isActive) {
        logger.warn({ username, userId: manager[0].id }, "Attempt to login to deactivated manager account");
        res.status(401).json({ error: "Account is deactivated. Contact admin." });
        return;
      }
      const valid = await verifyPassword(password, manager[0].passwordHash);
      logger.info({ username, userId: manager[0].id, valid }, "Manager password comparison result");
      if (!valid) {
        logger.warn({ username, userId: manager[0].id }, "Invalid manager credentials");
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
      logger.info({ username, userId: manager[0].id, role: "manager" }, "Manager login successful");
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

    logger.warn({ username }, "Login failed: user not found");
    res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    logger.error({ error, body: req.body }, "Login error");
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

router.post("/debug/seed-admin", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { username, password, name } = req.body as { username?: string; password?: string; name?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const displayName = name || username;
  const passwordHash = await bcrypt.hash(password, 10);
  logger.info({ username, displayName }, "Seeding admin account");

  const result = await pool.query(
    `INSERT INTO admins (name, username, password_hash, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (username) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       is_active = true
     RETURNING id, username, name, is_active`,
    [displayName, username, passwordHash],
  );

  logger.info({ username, userId: result.rows[0]?.id, isActive: result.rows[0]?.is_active }, "Admin seed complete");
  res.json({ seeded: result.rows[0], passwordHash });
});

router.get("/debug/auth-status", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

router.post("/logout", (req, res) => {
  res.json({ success: true });
});

export default router;

