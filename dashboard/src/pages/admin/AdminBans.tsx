import { useEffect, useState } from "react";
import { Window } from "../../components/Window";
import { API } from "../../config";
import { authHeaders } from "../../utils/auth";

interface BanDetail {
  type: string;
  value: string;
  reason?: string;
  banned_by?: string;
  created_at: number;
  expires_at?: number | null;
}

interface Bans {
  usernames: string[];
  ips: string[];
  details: BanDetail[];
}

export const AdminBans = () => {
  const [bans, setBans] = useState<Bans>({
    usernames: [],
    ips: [],
    details: [],
  });
  const [value, setValue] = useState("");
  const [type, setType] = useState<"username" | "ip">("username");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [msg, setMsg] = useState("");

  const fetchBans = () => {
    fetch(`${API}/admin/bans`, { headers: authHeaders() })
      .then((res) => res.json())
      .then(setBans)
      .catch(console.error);
  };

  useEffect(() => {
    fetchBans();
  }, []);

  const ban = async () => {
    if (!value.trim()) return;
    const res = await fetch(`${API}/admin/ban`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type,
        value: value.trim(),
        reason: reason.trim() || undefined,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
      }),
    });
    if (res.ok) {
      const durText =
        durationMinutes > 0 ? ` [${durationMinutes}m]` : " [perm]";
      setMsg(`Banned: ${value}${durText}${reason ? ` (${reason})` : ""}`);
      setValue("");
      setReason("");
      fetchBans();
    } else {
      setMsg("Error");
    }
  };

  const unban = async (type: "username" | "ip", value: string) => {
    const res = await fetch(`${API}/admin/ban`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ type, value }),
    });
    if (res.ok) fetchBans();
  };

  const findDetail = (type: string, value: string) =>
    bans.details.find((d) => d.type === type && d.value === value);

  const formatExpiry = (expiresAt?: number | null) => {
    if (!expiresAt)
      return <span className="text-warning-500/80 text-[10px]">permanent</span>;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0)
      return <span className="text-muted-500 text-[10px]">expirÃ©</span>;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60)
      return <span className="text-primary-400 text-[10px]">exp: ~{diffMin}m</span>;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24)
      return (
        <span className="text-primary-400 text-[10px]">exp: ~{diffHours}h</span>
      );
    const diffDays = Math.round(diffHours / 24);
    return <span className="text-primary-400 text-[10px]">exp: ~{diffDays}j</span>;
  };

  return (
    <Window title="BAN MANAGEMENT">
      <div className="space-y-4 font-mono text-xs">
        <div className="flex flex-wrap gap-2">
          <select
            className="bg-muted-900 text-muted-200 border border-border p-2 focus:outline-none"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="username">username</option>
            <option value="ip">ip</option>
          </select>
          <input
            className="bg-muted-900 text-muted-200 border border-border p-2 flex-1 min-w-[140px] focus:outline-none"
            placeholder="target..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <select
            className="bg-muted-900 text-muted-200 border border-border p-2 focus:outline-none"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            <option value={0}>Permanent</option>
            <option value={15}>15 minutes</option>
            <option value={60}>1 heure</option>
            <option value={1440}>24 heures</option>
            <option value={4320}>3 jours</option>
            <option value={10080}>7 jours</option>
            <option value={43200}>30 jours</option>
          </select>
          <button
            className="bg-danger-900 hover:bg-danger-800 text-danger-200 px-4 border border-danger-700 font-bold"
            onClick={ban}
          >
            BAN
          </button>
        </div>
        <input
          className="bg-muted-900 text-muted-200 border border-border p-2 w-full focus:outline-none"
          placeholder="reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {msg && <div className="text-primary-400">{msg}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border">
            <div className="bg-title px-2 py-1 border-b border-border text-muted-300">
              BANNED USERNAMES
            </div>
            <div className="p-2 max-h-60 overflow-y-auto text-danger-400">
              {bans.usernames.map((u, i) => {
                const detail = findDetail("username", u);
                return (
                  <div
                    key={i}
                    className="p-0.5 flex justify-between items-start"
                  >
                    <div className="flex flex-col">
                      <span>{u}</span>
                      <div className="flex gap-2 items-center">
                        {formatExpiry(detail?.expires_at)}
                        {detail?.reason && (
                          <span className="text-muted-500 text-[10px]">
                            reason: {detail.reason}
                          </span>
                        )}
                        {detail?.banned_by && (
                          <span className="text-muted-600 text-[10px]">
                            by: {detail.banned_by}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => unban("username", u)}
                      className="text-muted-500 hover:text-muted-300 ml-2"
                    >
                      [x]
                    </button>
                  </div>
                );
              })}
              {bans.usernames.length === 0 && (
                <div className="text-muted-600">none</div>
              )}
            </div>
          </div>
          <div className="border border-border">
            <div className="bg-title px-2 py-1 border-b border-border text-muted-300">
              BANNED IPS
            </div>
            <div className="p-2 max-h-60 overflow-y-auto text-danger-400">
              {bans.ips.map((u, i) => {
                const detail = findDetail("ip", u);
                return (
                  <div
                    key={i}
                    className="p-0.5 flex justify-between items-start"
                  >
                    <div className="flex flex-col">
                      <span>{u}</span>
                      <div className="flex gap-2 items-center">
                        {formatExpiry(detail?.expires_at)}
                        {detail?.reason && (
                          <span className="text-muted-500 text-[10px]">
                            reason: {detail.reason}
                          </span>
                        )}
                        {detail?.banned_by && (
                          <span className="text-muted-600 text-[10px]">
                            by: {detail.banned_by}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => unban("ip", u)}
                      className="text-muted-500 hover:text-muted-300 ml-2"
                    >
                      [x]
                    </button>
                  </div>
                );
              })}
              {bans.ips.length === 0 && (
                <div className="text-muted-600">none</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
};
