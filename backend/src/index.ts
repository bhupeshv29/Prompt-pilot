import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import conversationRouter from "./routes/conversations";
import questionRouter from "./routes/questions";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "ok", uptime: process.uptime() });
});

app.use("/auth", authRouter);
app.use("/conversations", conversationRouter);
app.use("/questions", questionRouter);

app.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
