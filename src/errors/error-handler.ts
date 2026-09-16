import AppError from "./app-error.ts";
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ ok: false, message: err.message });
  }

  console.log(err.message);
  return res
    .status(500)
    .json({ ok: false, message: "Error interno del servidor" });
};
