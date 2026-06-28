import { Router, type IRouter } from "express";
import healthRouter from "./health";
import solarRouter from "./solar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(solarRouter);

export default router;
