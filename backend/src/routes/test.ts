import { Router } from "express";
import { generateText } from "../Provider/groq";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.json({
        error: "prompt is required",
      });
    }

    const result = await generateText(prompt);

    res.json({
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "failed to generate response",
    });
  }
});

export default router;
