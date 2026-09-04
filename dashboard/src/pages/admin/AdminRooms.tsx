import { useEffect, useState } from "react";
import { Window } from "../../components/Window";
import { DataTable } from "../../components/DataTable";
import { API } from "../../config";
import { authHeaders } from "../../utils/auth";
import {
  fromGameIdNumber,
  toGameIdNumber,
  isValidGameId,
} from "../../utils/gameId";

interface RoomRow {
  id: number;
  name: string;
  slug: string;
  port: number;
  max_members: number;
  preferred_game_name: string;
  preferred_game_id: number;
  description: string;
  status: string;
  auto_start: number;
  pid: number | null;
  announced_room_id: string | null;
  players: number;
}

const emptyForm = {
  name: "",
  port: "",
  max_members: "16",
  preferred_game_name: "Any Game",
  preferred_game_id: "0x0004000000000000",
  description: "",
  auto_start: false,
};

export const AdminRooms = () => {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = () => {
    fetch(`${API}/admin/rooms`, { headers: authHeaders() })
      .then((res) => res.json())
      .then(setRooms)
      .catch(console.error);
    fetch(`${API}/rooms`)
      .then((res) => res.json())
      .then(setLiveRooms)
      .catch(console.error);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const copyAddress = (port: number) => {
    const addr = `${window.location.hostname}:${port}`;
    navigator.clipboard.writeText(addr);
    setMsg(`Copied ${addr} to clipboard`);
    setTimeout(() => setMsg(""), 2000);
  };

  const act = async (method: string, id: number, action: string) => {
    const res = await fetch(`${API}/admin/rooms/${id}${action}`, {
      method,
      headers: authHeaders(),
    });
    setMsg(
      (await res.json().catch(() => ({ success: false }))).success
        ? "Ok"
        : "Error",
    );
    fetchAll();
  };

  const create = async () => {
    if (!form.name || !form.port) {
      setMsg("name and port required");
      return;
    }
    if (!isValidGameId(form.preferred_game_id)) {
      setMsg("invalid game id (hex)");
      return;
    }
    const res = await fetch(`${API}/admin/rooms`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: form.name,
        port: Number(form.port),
        max_members: Number(form.max_members),
        preferred_game_name: form.preferred_game_name,
        preferred_game_id: toGameIdNumber(form.preferred_game_id),
        description: form.description,
        auto_start: form.auto_start,
      }),
    });
    setMsg(res.ok ? "Room created" : await res.text());
    setShowForm(false);
    setForm(emptyForm);
    fetchAll();
  };

  const update = async () => {
    if (!editing) return;
    if (!isValidGameId(form.preferred_game_id)) {
      setMsg("invalid game id (hex)");
      return;
    }
    const res = await fetch(`${API}/admin/rooms/${editing.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        name: form.name,
        max_members: Number(form.max_members),
        preferred_game_name: form.preferred_game_name,
        preferred_game_id: toGameIdNumber(form.preferred_game_id),
        description: form.description,
        auto_start: form.auto_start,
      }),
    });
    setMsg(res.ok ? "Room updated" : await res.text());
    setEditing(null);
    setForm(emptyForm);
    fetchAll();
  };

  const startEdit = (r: RoomRow) => {
    setEditing(r);
    setForm({
      name: r.name,
      port: String(r.port),
      max_members: String(r.max_members),
      preferred_game_name: r.preferred_game_name,
      preferred_game_id: fromGameIdNumber(r.preferred_game_id),
      description: r.description,
      auto_start: !!r.auto_start,
    });
    setShowForm(true);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this room config?")) return;
    await act("DELETE", id, "");
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <Window
        title={`ROOM CONFIGS - ${rooms.filter((r) => r.status === "running").length} RUNNING / ${rooms.length} TOTAL`}
      >
        {msg && (
          <div className="text-sky-400 font-mono text-xs mb-2">{msg}</div>
        )}
        <div className="flex gap-2 mb-3">
          <button
            className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-4 py-1.5 border border-sky-700 font-mono text-xs"
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            {showForm ? "CANCEL" : "+ NEW ROOM"}
          </button>
        </div>

        {showForm && (
          <div className="border border-border p-3 mb-3 font-mono text-xs space-y-2">
            <div className="text-neutral-400 mb-1">
              {editing ? `EDITING: ${editing.name}` : "NEW ROOM"}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Room name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Port"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                disabled={!!editing}
              />
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Max players"
                value={form.max_members}
                onChange={(e) =>
                  setForm({ ...form, max_members: e.target.value })
                }
              />
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Game name"
                value={form.preferred_game_name}
                onChange={(e) =>
                  setForm({ ...form, preferred_game_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Game ID (hex)"
                value={form.preferred_game_id}
                onChange={(e) =>
                  setForm({ ...form, preferred_game_id: e.target.value })
                }
              />
              <input
                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <label className="flex items-center gap-2 text-neutral-400 p-2">
                <input
                  type="checkbox"
                  checked={form.auto_start}
                  onChange={(e) =>
                    setForm({ ...form, auto_start: e.target.checked })
                  }
                />
                auto start
              </label>
              <button
                className={`px-4 py-2 border font-mono text-xs ${editing ? "bg-amber-900 hover:bg-amber-800 text-amber-100 border-amber-700" : "bg-green-900 hover:bg-green-800 text-green-100 border-green-700"}`}
                onClick={editing ? update : create}
              >
                {editing ? "UPDATE" : "CREATE"}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={[
            "NAME",
            "PORT",
            "GAME",
            "GAME ID",
            "STATUS",
            "PID",
            "PLAYERS",
            "ACTIONS",
          ]}
          data={rooms.map((r) => {
            const live = liveRooms.find((l) => l.port === r.port);
            return {
              name: (
                <span className="text-neutral-200">
                  {r.name}
                  {r.auto_start ? " *" : ""}
                </span>
              ),
              port: <span className="text-orange-400">{r.port}</span>,
              game: (
                <span className="text-orange-400">{r.preferred_game_name}</span>
              ),
              "game id": (
                <span className="text-neutral-500 text-[10px]">
                  {fromGameIdNumber(r.preferred_game_id)}
                </span>
              ),
              status: (
                <span
                  className={
                    r.status === "running"
                      ? "text-green-500"
                      : "text-neutral-500"
                  }
                >
                  {r.status}
                </span>
              ),
              pid: <span className="text-neutral-500">{r.pid ?? "-"}</span>,
              players: (
                <span className="text-green-500">
                  {live?.players?.length ?? 0} / {r.max_members}
                </span>
              ),
              actions: (
                <div className="flex gap-2">
                  {r.status === "running" ? (
                    <button
                      className="text-red-400 hover:text-red-300 hover:underline"
                      onClick={() => act("POST", r.id, "/stop")}
                    >
                      [stop]
                    </button>
                  ) : (
                    <button
                      className="text-green-400 hover:text-green-300 hover:underline"
                      onClick={() => act("POST", r.id, "/start")}
                    >
                      [start]
                    </button>
                  )}
                  <button
                    className="text-neutral-400 hover:text-neutral-200 hover:underline"
                    onClick={() => copyAddress(r.port)}
                  >
                    [copy ip]
                  </button>
                  <button
                    className="text-sky-400 hover:text-sky-300 hover:underline"
                    onClick={() => startEdit(r)}
                  >
                    [edit]
                  </button>
                  <button
                    className="text-neutral-500 hover:text-red-400 hover:underline"
                    onClick={() => del(r.id)}
                  >
                    [del]
                  </button>
                </div>
              ),
            };
          })}
        />
      </Window>
    </div>
  );
};
