import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config/constant";

interface Decode extends JwtPayload {
  userId: string;
}

export default function AuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token!, JWT_SECRET as string) as Decode;

    req.userId = decoded.userId;

    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "invalid or expired token" });
  }
}
