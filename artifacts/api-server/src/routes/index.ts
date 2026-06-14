import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import managersRouter from "./managers";
import doctorsRouter from "./doctors";
import videosRouter from "./videos";
import analyticsRouter from "./analytics";
import auditLogsRouter from "./audit-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/managers", managersRouter);
router.use("/doctors", doctorsRouter);
router.use("/videos", videosRouter);
router.use("/analytics", analyticsRouter);
router.use("/audit-logs", auditLogsRouter);

export default router;
