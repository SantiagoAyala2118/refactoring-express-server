import "dotenv/config";
import router from "./routes/employee.routes.ts";
import express from "express";
import type { Application } from "express";
import { errorHandler } from "./errors/error-handler.ts";

const app: Application = express();

app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export default app;
