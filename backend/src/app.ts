import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { bidderRouter } from "./routes/bidder";
import { createRoleMeRouter } from "./routes/roleMe";
import { tendersRouter } from "./routes/tenders";
import { officerApplicationsRouter } from "./routes/officerApplications";
import { verificationRouter } from "./routes/verification";
import { entityResolutionRouter } from "./routes/entityResolution";
import { complianceRouter } from "./routes/compliance";
import { evidenceRouter } from "./routes/evidence";
import { comparisonRouter } from "./routes/comparison";
import { resolutionRouter } from "./routes/resolution";
import { sendError } from "./http/errors";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin,
    })
  );
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/bidder", bidderRouter);
  app.use("/api/officer", createRoleMeRouter("officer"));
  app.use("/api/officer", officerApplicationsRouter);
  app.use("/api/officer", comparisonRouter);
  app.use("/api/officer", resolutionRouter);
  app.use("/api/admin", createRoleMeRouter("admin"));
  app.use("/api/tenders", tendersRouter);
  app.use("/api/verification", verificationRouter);
  app.use("/api/entity-resolution", entityResolutionRouter);
  app.use("/api/compliance", complianceRouter);
  app.use("/api/evidence", evidenceRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    sendError(res, 500, "Internal server error");
  });

  return app;
}
