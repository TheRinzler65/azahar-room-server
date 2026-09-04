import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API } from "../config";

export const Footer = () => {
  const appVersion = import.meta.env.VITE_APP_VERSION || "v-dev";
  const [status, setStatus] = useState<"ok" | "error" | "loading">("loading");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API}/`);
        setStatus(res.ok ? "ok" : "error");
      } catch {
        setStatus("error");
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-muted-950 border-t border-border px-4 py-3 font-mono text-[10px] text-muted-500">
      <div className="max-w-6xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-muted-400">AZAHAR ROOM SERVER</span>
          <span className="hidden sm:inline text-muted-700">|</span>
          <span>version: {appVersion}</span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Link
            to="/privacy"
            className="text-muted-400 hover:text-primary-400 transition-colors"
          >
            Privacy
          </Link>
          <span className="hidden sm:inline text-muted-700">|</span>
          <Link
            to="/status"
            className="text-muted-400 hover:text-primary-400 transition-colors"
          >
            Status
          </Link>
          <span className="hidden sm:inline text-muted-700">|</span>
          <a
            href="https://github.com/TheRinzler65/azahar-room-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-400 hover:text-primary-400 transition-colors"
          >
            GitHub
          </a>
          <span className="hidden sm:inline text-muted-700">|</span>
          <Link
            to="/status"
            className="flex items-center gap-1.5 hover:opacity-85 transition-opacity"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full block ${
                status === "ok"
                  ? "bg-success-500"
                  : status === "error"
                    ? "bg-danger-500"
                    : "bg-muted-500 animate-pulse"
              }`}
            />
            <span
              className={
                status === "ok"
                  ? "text-success-400"
                  : status === "error"
                    ? "text-danger-400"
                    : "text-muted-400"
              }
            >
              {status === "ok"
                ? "All systems operational"
                : status === "error"
                  ? "System outage"
                  : "Checking status..."}
            </span>
          </Link>
          <span className="hidden sm:inline text-muted-700">|</span>
          <span>© {new Date().getFullYear()} Rinzler</span>
        </div>
      </div>
    </footer>
  );
};
