import { Router } from "express";
import AuthMiddleware from "../middleware/auth.middleware";
import { AnswerQuestionSchema } from "../types/toolSchema";
import { answerQuestion } from "../agents/loop";

const router = Router();

router.use(AuthMiddleware);

router.post("/:id/answer", async (req, res) => {
  const parsed = AnswerQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid answer" });
  }

  const result = await answerQuestion({
    questionId: req.params.id!,
    answer: parsed.data.answer,
    userId: req.userId!,
  });

  if ("error" in result) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.json(result.result);
});

export default router;
