import "dotenv/config";
import express from "express";
import cors from "cors";
import testRouter from "./routes/test";
import authRouter from "./routes/auth";
import conversationRouter from "./routes/conversations";

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ message: "ok" });
});

app.use("/auth", authRouter);
app.use("/conversations", conversationRouter);

app.use("/api/test", testRouter);

app.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
