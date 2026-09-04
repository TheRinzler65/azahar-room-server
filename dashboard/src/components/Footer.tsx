import { useEffect, useState } from "react";
import { API } from "../config";

export const Footer = () => {
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API}/`)
      .then((res) => setApiUp(res.ok))
      .catch(() => setApiUp(false));
  }, []);

  return (
    <footer className="bg-muted-950 border-t border-border px-4 py-3 font-mono text-[10px] text-muted-500">
      <div className="max-w-6xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-muted-400">AZAHAR ROOM SERVER</span>
          <span className="hidden sm:inline text-muted-700">|</span>
          <span>v1.0.0</span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <a
            href="https://github.com/TheRinzler65/azahar-room-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-400 hover:text-primary-400 transition-colors"
          >
            GitHub
          </a>
          <span className="hidden sm:inline text-muted-700">|</span>
          <a
            href="/privacy"
            className="text-muted-400 hover:text-primary-400 transition-colors"
          >
            Privacy & Legal
          </a>
          <span className="hidden sm:inline text-muted-700">|</span>
          <a
            href="/status"
            className="flex items-center gap-1.5 hover:text-primary-400 transition-colors"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full block ${
                apiUp === null
                  ? "bg-muted-600"
                  : apiUp
                    ? "bg-success-500"
                    : "bg-danger-500"
              }`}
            />
            <span
              className={
                apiUp === null
                  ? "text-muted-600"
                  : apiUp
                    ? "text-success-600"
                    : "text-danger-600"
              }
            >
              {apiUp === null
                ? "Checking..."
                : apiUp
                  ? "All systems operational"
                  : "System offline"}
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};
