import { useEffect, useState } from "react";
import { Window } from "../components/Window";
import { API } from "../config";

interface Check {
  name: string;
  url: string;
  status: "ok" | "error" | "loading";
  latency: number | null;
}

export const StatusPage = () => {
  const [checks, setChecks] = useState<Check[]>([
    { name: "API Server", url: `${API}/`, status: "loading", latency: null },
    {
      name: "Lobby (Rooms)",
      url: `${API}/rooms`,
      status: "loading",
      latency: null,
    },
    {
      name: "Auth Server",
      url: `${API}/jwt/internal`,
      status: "loading",
      latency: null,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const runChecks = async () => {
    setIsRefreshing(true);
    const results = await Promise.all(
      checks.map(async (check) => {
        const start = performance.now();
        try {
          const res = await fetch(check.url, { method: "GET" });
          const latency = Math.round(performance.now() - start);
          return {
            ...check,
            status: res.ok ? "ok" : "error",
            latency,
          } as Check;
        } catch {
          return {
            ...check,
            status: "error",
            latency: null,
          } as Check;
        }
      }),
    );
    setChecks(results);
    setIsRefreshing(false);
  };

  useEffect(() => {
    runChecks();
    const timer = setInterval(runChecks, 15000);
    return () => clearInterval(timer);
  }, []);

  const allOk = checks.every((c) => c.status === "ok");
  const anyError = checks.some((c) => c.status === "error");

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 font-mono text-xs">
      <Window title="SYSTEM STATUS">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div
              className={`flex-1 p-3 border text-center font-bold ${
                allOk
                  ? "border-success-700 bg-success-950/40 text-success-400"
                  : anyError
                    ? "border-danger-700 bg-danger-950/40 text-danger-400"
                    : "border-muted-700 bg-muted-900 text-muted-400"
              }`}
            >
              {allOk
                ? "● ALL SYSTEMS OPERATIONAL"
                : anyError
                  ? "✕ PARTIAL OUTAGE"
                  : "… CHECKING"}
            </div>
            <button
              onClick={runChecks}
              disabled={isRefreshing}
              className="ml-2 px-3 py-3 border border-border bg-muted-900 hover:bg-muted-800 text-muted-300 transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              {isRefreshing ? "…" : "↻"}
            </button>
          </div>

          <div className="space-y-1">
            {checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between border border-border px-3 py-2 bg-muted-900/40"
              >
                <span className="text-muted-300">{check.name}</span>
                <div className="flex items-center gap-3">
                  {check.latency !== null && (
                    <span className="text-muted-600 text-[10px]">
                      {check.latency}ms
                    </span>
                  )}
                  <span
                    className={`font-bold ${
                      check.status === "ok"
                        ? "text-success-400"
                        : check.status === "error"
                          ? "text-danger-400"
                          : "text-muted-500"
                    }`}
                  >
                    {check.status === "ok"
                      ? "ONLINE"
                      : check.status === "error"
                        ? "OFFLINE"
                        : "…"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-muted-600 text-[10px]">
            Auto-refresh every 15 seconds
          </div>
        </div>
      </Window>
    </div>
  );
};
