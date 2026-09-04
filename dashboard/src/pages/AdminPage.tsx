import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Window } from "../components/Window";
import { AdminRooms } from "./admin/AdminRooms";
import { AdminChat } from "./admin/AdminChat";
import { AdminBans } from "./admin/AdminBans";
import { AdminStats } from "./admin/AdminStats";
import { AdminPlayers } from "./admin/AdminPlayers";
import { AdminLobby } from "./admin/AdminLobby";
import { AdminAudit } from "./admin/AdminAudit";
import { useNotifications } from "../hooks/useNotifications";
import { API } from "../config";

type Tab = "rooms" | "chat" | "lobby" | "bans" | "players" | "stats" | "audit";

export const AdminPage = () => {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(
    !!sessionStorage.getItem("azahar_admin_jwt"),
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("rooms");
  const { notifications, dismiss, clear } = useNotifications(loggedIn);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("azahar_admin_jwt", data.token);
        setLoggedIn(true);
        setLoginError("");
      } else {
        setLoginError("Access denied");
      }
    } catch {
      setLoginError("Connection error");
    }
  };

  if (!loggedIn) {
    return (
      <div className="max-w-md mx-auto p-4 mt-10">
        <Window title="ADMIN AUTHENTICATION">
          <form onSubmit={login} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-neutral-400">password</label>
              <input
                type="password"
                className="bg-neutral-900 text-neutral-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-sky-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <div className="text-red-400">{loginError}</div>}
            <button className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-4 py-2 border border-sky-700 w-full">
              AUTHENTICATE
            </button>
          </form>
        </Window>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "rooms", label: "ROOMS" },
    { id: "chat", label: "CHAT" },
    { id: "lobby", label: "LOBBY" },
    { id: "bans", label: "BANS" },
    { id: "players", label: "PLAYERS" },
    { id: "stats", label: "STATS" },
    { id: "audit", label: "AUDIT" },
  ];

  const render = () => {
    switch (tab) {
      case "rooms":
        return <AdminRooms />;
      case "chat":
        return <AdminChat />;
      case "lobby":
        return <AdminLobby />;
      case "bans":
        return <AdminBans />;
      case "players":
        return <AdminPlayers />;
      case "stats":
        return <AdminStats />;
      case "audit":
        return <AdminAudit />;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("azahar_admin_jwt");
    setLoggedIn(false);
    navigate("/");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1 border border-border font-mono text-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 ${tab === t.id ? "bg-sky-900/60 text-sky-100" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"} border-r border-border last:border-r-0`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-green-500">● AUTHENTICATED</span>
          <button onClick={logout} className="text-red-400 hover:underline">
            logout
          </button>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="border border-orange-800 bg-orange-950/30 font-mono text-xs">
          <div className="flex items-center justify-between px-3 py-2 border-b border-orange-800/50">
            <span className="text-orange-400 font-bold">
              NOTIFICATIONS ({notifications.length})
            </span>
            <button
              onClick={clear}
              className="text-neutral-500 hover:text-neutral-300"
            >
              [clear all]
            </button>
          </div>
          <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex justify-between items-center gap-2 text-neutral-300"
              >
                <div>
                  <span className="text-neutral-600">
                    [{new Date(n.timestamp).toLocaleTimeString()}]
                  </span>{" "}
                  {n.message}
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="text-neutral-600 hover:text-neutral-300"
                >
                  [x]
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {render()}
    </div>
  );
};
