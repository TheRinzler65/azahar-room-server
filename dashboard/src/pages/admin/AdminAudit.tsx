import { useEffect, useState } from "react";
import { Window } from "../../components/Window";
import { API } from "../../config";
import { authHeaders } from "../../utils/auth";

interface AuditLog {
  id: number;
  admin_username: string;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: number;
}

export const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    fetch(`${API}/admin/audit-logs?limit=200`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.startsWith("BAN_ADD")) {
      return (
        <span className="bg-danger-950/80 text-danger-400 border border-danger-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
          BAN
        </span>
      );
    }
    if (action.startsWith("BAN_REMOVE")) {
      return (
        <span className="bg-success-950/80 text-success-400 border border-success-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
          UNBAN
        </span>
      );
    }
    if (action.includes("LOGIN")) {
      return (
        <span className="bg-primary-950/80 text-primary-400 border border-primary-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
          AUTH
        </span>
      );
    }
    if (action.startsWith("ROOM_")) {
      return (
        <span className="bg-warning-950/80 text-warning-400 border border-warning-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
          {action.replace("ROOM_", "")}
        </span>
      );
    }
    return (
      <span className="bg-muted-800 text-muted-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
        {action}
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const query = filter.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      (log.target && log.target.toLowerCase().includes(query)) ||
      (log.admin_username &&
        log.admin_username.toLowerCase().includes(query)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(query))
    );
  });

  return (
    <Window title={`ADMIN AUDIT LOGS (${logs.length})`}>
      <div className="space-y-3 font-mono text-xs">
        <div className="flex gap-2">
          <input
            className="bg-muted-900 text-muted-200 border border-border p-2 flex-1 focus:outline-none"
            placeholder="Search logs by action, target, IP..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            onClick={fetchLogs}
            className="bg-muted-800 hover:bg-muted-700 text-muted-200 px-4 border border-border"
          >
            REFRESH
          </button>
        </div>

        <div className="border border-border overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted-800 text-muted-400 border-b border-border">
                <th className="p-2 border-r border-border w-36">DATE</th>
                <th className="p-2 border-r border-border w-24">ACTION</th>
                <th className="p-2 border-r border-border w-40">TARGET</th>
                <th className="p-2 border-r border-border">DETAILS</th>
                <th className="p-2 w-28">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-500">
                    No logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className={`${idx % 2 === 0 ? "bg-muted-900" : "bg-muted-950"} hover:bg-muted-800/40 border-b border-border/40`}
                  >
                    <td className="p-2 border-r border-border text-muted-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-border whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-2 border-r border-border text-primary-400 font-bold">
                      {log.target || "-"}
                    </td>
                    <td className="p-2 border-r border-border text-muted-300 font-sans text-[11px] break-all">
                      {log.details || "-"}
                    </td>
                    <td className="p-2 text-muted-500 text-[11px] whitespace-nowrap">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Window>
  );
};
