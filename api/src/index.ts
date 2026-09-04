import path from "path";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initDB } from "./db";
import { loadEnv } from "./env";
import { startAutoRooms } from "./roomManager";
import { syncBanFile } from "./utils/banfile";
import { expireLobbyRooms } from "./db/lobby";
import { initWebSocket } from "./ws";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import chatRoutes from "./routes/chat";
import statsRoutes from "./routes/stats";
import adminRoutes from "./routes/admin";

loadEnv();

initDB().then(async () => {
  await syncBanFile();
  await startAutoRooms();
});

setInterval(() => {
  expireLobbyRooms(120000).catch(() => {});
}, 30000);

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

const allowedOrigins = [
  "https://rinzler-azahar.duckdns.org",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://192.168.88.41",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});
app.use(globalLimiter);

app.get("/", (_req, res) => {
  res.json({ service: "azahar-master-api", status: "ok" });
});

app.use("/api", authRoutes);
app.use(authRoutes);

app.use("/api", roomRoutes);
app.use(roomRoutes);

app.use("/api", chatRoutes);
app.use("/api", statsRoutes);
app.use("/api", adminRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Azahar Master Server API running on port ${PORT}`);
});
initWebSocket(server);
