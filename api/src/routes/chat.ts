import { Router } from "express";
import { chatLogs } from "../state";

const router = Router();

router.get("/chat/:id", (req, res) => {
  const { id } = req.params;
  const history = chatLogs[id] || [];
  res.setHeader("Content-Type", "application/json");
  res.json(history);
});

export default router;
