import { Router } from "express";
import { activityHistory } from "../state";
import {
  listActivityDB,
  listPlayerPresence,
  listGamePresence,
} from "../db/stats";

const router = Router();

router.get("/stats/activity", async (req, res) => {
  const fromDB = await listActivityDB();
  res.json(fromDB.length ? fromDB : activityHistory);
});

router.get("/stats/top-games", async (req, res) => {
  const rows = await listGamePresence(10);
  res.json(
    rows.map((r) => ({ game: r.game, minutes: Math.round(Number(r.minutes)) })),
  );
});

router.get("/stats/top-players", async (req, res) => {
  const rows = await listPlayerPresence(10);
  res.json(
    rows.map((r) => ({
      nickname: r.nickname,
      minutes: Math.round(Number(r.minutes)),
    })),
  );
});

export default router;
