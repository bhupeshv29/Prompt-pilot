import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/constant";
import { AuthSchema } from "../types/authSchema";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import AuthMiddleware from "../middleware/auth.middleware";
const router = Router();

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET!, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const parsed = AuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid email or password" });
  }

  const { email, password } = parsed.data;

  const hashedPassword = await bcrypt.hash(password, 5);
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: hashedPassword },
    });
    return res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.log(error);

    return res.status(409).json({ error: "email already in use" });
  }
});

router.post("/login", async (req, res) => {

  const parsed = AuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid email or password" });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const isPasswordCorrect = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );
  if (!isPasswordCorrect) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  return res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email },
  });
});

router.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

router.get("/me", AuthMiddleware, async (req, res) => {
  
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  return res.json({ user });
});

export default router;
