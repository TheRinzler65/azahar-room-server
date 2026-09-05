import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Window } from "../components/Window";
import { API } from "../config";

const emuApiUrl = import.meta.env.VITE_EMU_API_URL || "http://localhost:3000";

interface ActiveRoom {
  id: string;
  name: string;
  port: number;
  address?: string;
  players?: any[];
  max_members?: number;
  maxPlayers?: number;
  preferred_game_name?: string;
  preferredGameName?: string;
}

interface Profile {
  username: string;
  citraToken?: string;
  createdAt: number;
  minutesOnline: number;
}

export const PlayPage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState("");
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showToken, setShowToken] = useState(false);
  
  const playerName = sessionStorage.getItem("azahar_player_name");

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load active rooms", e);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (!playerName) {
      setLoadingProfile(false);
      return;
    }
    const jwt = sessionStorage.getItem("azahar_player_jwt");
    const headers: Record<string, string> = {};
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    
    fetch(`${API}/player/${playerName}`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Profile not found");
        return res.json();
      })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [playerName]);

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 font-mono text-xs">
      <Window title="LIVE ROOMS">
        <div className="space-y-3">
          <div className="text-muted-400">
            Copy the direct room address and connect via{" "}
            <span className="text-primary-400 font-bold">
              Multiplayer → Direct Connect to Room
            </span>{" "}
            in Azahar.
          </div>
          <div className="text-muted-400">
            Or you can browse public rooms via{" "}
            <span className="text-primary-400 font-bold">
              Multiplayer → Browse Public Rooms
            </span>{" "}
            in Azahar.
          </div>
          <div className="text-muted-500 bg-muted-900/60 border border-border p-2">
            Rooms listed here are hosted by our dedicated server and reachable
            from anywhere on the internet.{" "}
            <span className="text-warning-400">
              Note: room visible does not mean joinable.
            </span>{" "}
            A room created from inside the emulator ("Host Room") is hosted on
            the creator's own machine — it appears in Browse Public Rooms, but
            you can only join it if the host is on your network or has its UDP
            port forwarded publicly.
          </div>

          {loadingRooms ? (
            <div className="text-muted-500 py-3">Scanning active rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="text-muted-500 py-3 border border-dashed border-border text-center">
              No active rooms online right now. Rooms will appear automatically
              once started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {rooms.map((r, idx) => {
                const host = r.address || window.location.hostname;
                const targetAddr = `${host}:${r.port}`;
                const gameTitle =
                  r.preferred_game_name || r.preferredGameName || "Any Game";
                const currentPlayers = r.players?.length ?? 0;
                const maxCap = r.max_members || r.maxPlayers || 16;
                const isCopied = copied === `room-${idx}`;

                return (
                  <div
                    key={r.id || idx}
                    className="border border-border bg-muted-900/60 p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-muted-200 text-sm">
                          {r.name}
                        </div>
                        <span className="text-[10px] text-success-400 bg-success-950/40 border border-success-800 px-1.5 py-0.5">
                          {currentPlayers}/{maxCap} PLAYERS
                        </span>
                      </div>
                      <div className="text-muted-400 text-[11px] mt-0.5">
                        {gameTitle}
                      </div>
                      <div className="text-muted-500 text-[10px] mt-1 font-mono">
                        Port: {r.port} | Host: {host}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-muted-800/80">
                      <button
                        onClick={() => copy(targetAddr, `room-${idx}`)}
                        className={`w-full py-1.5 border text-center font-bold text-[11px] transition-colors ${
                          isCopied
                            ? "bg-success-900/60 border-success-700 text-success-200"
                            : "bg-muted-800 hover:bg-muted-700 text-muted-200 border-border"
                        }`}
                      >
                        {isCopied
                          ? "COPIED TO CLIPBOARD!"
                          : `COPY ADDRESS (${targetAddr})`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Window>

      <Window title="HOW TO PLAY">
        <div className="space-y-6">
          <div className="flex gap-3 border-b border-border pb-4">
            <span className="text-primary-400 font-bold text-lg shrink-0">
              01
            </span>
            <div className="space-y-1">
              <div className="text-muted-200 font-bold">Download Azahar</div>
              <div className="text-muted-500">
                Get the latest Azahar build for your platform.
              </div>
              <a
                href="https://azahar-emu.org/pages/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:underline"
              >
                azahar-emu.org/pages/download/
              </a>
            </div>
          </div>

          <div className="flex gap-3 border-b border-border pb-4">
            <span className="text-primary-400 font-bold text-lg shrink-0">
              02
            </span>
            <div className="space-y-1">
              <div className="text-muted-200 font-bold">
                Register an Account
              </div>
              <div className="text-muted-500">
                Create your player account on this dashboard.
              </div>
              <a href="/register" className="text-primary-400 hover:underline">
                Register here
              </a>
            </div>
          </div>

          <div className="flex gap-3 border-b border-border pb-4">
            <span className="text-primary-400 font-bold text-lg shrink-0">
              03
            </span>
            <div className="space-y-2">
              <div className="text-muted-200 font-bold">Configure Network</div>
              <div className="text-muted-500">
                In Azahar:{" "}
                <span className="text-muted-300">
                  Emulation → Configure… → General → Network
                </span>
              </div>
              <div className="space-y-2 mt-2">
                <div>
                  <div className="text-muted-400 mb-1">
                    Network Web API URL :
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={emuApiUrl}
                      className="bg-muted-900 text-primary-400 border border-border px-2 py-1 flex-1 focus:outline-none"
                    />
                    <button
                      onClick={() => copy(emuApiUrl, "url")}
                      className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-3 py-1 border border-primary-700 shrink-0"
                    >
                      {copied === "url" ? "Copied!" : "COPY"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-muted-400 mb-1">Network Token :</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center">
                      <input
                        readOnly
                        type="text"
                        value={
                          !playerName
                            ? "Please sign in to view your token"
                            : profile?.citraToken
                              ? showToken
                                ? profile.citraToken
                                : "••••••••••••••••"
                              : loadingProfile
                                ? "Loading profile..."
                                : "not set"
                        }
                        className="bg-muted-900 text-warning-400 border border-border px-2 py-1 pr-8 w-full focus:outline-none"
                      />
                      {profile?.citraToken && (
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2 text-muted-400 hover:text-muted-200"
                          title={showToken ? "Cacher le token" : "Afficher le token"}
                        >
                          {showToken ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m14.41 14.41l-3.59-3.59" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        profile?.citraToken && copy(profile.citraToken, "token")
                      }
                      disabled={!profile?.citraToken}
                      className={`px-3 py-1 border shrink-0 ${
                        !profile?.citraToken
                          ? "opacity-50 cursor-not-allowed bg-muted-800 text-muted-500 border-border"
                          : "bg-primary-900 hover:bg-primary-800 text-primary-100 border-primary-700"
                      }`}
                    >
                      {copied === "token" ? "Copied!" : "COPY"}
                    </button>
                  </div>
                  {!playerName ? (
                    <div className="text-muted-500 mt-1">
                      <Link to="/login" className="text-primary-400 hover:underline">Sign in</Link> or <Link to="/register" className="text-primary-400 hover:underline">register</Link> to get your network token.
                    </div>
                  ) : (
                    <div className="text-muted-500 mt-1">
                      Your citra_token (shown after registration in your Profile).
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-b border-border pb-4">
            <span className="text-primary-400 font-bold text-lg shrink-0">
              04
            </span>
            <div className="space-y-2">
              <div className="text-muted-200 font-bold">Set Your Username</div>
              <div className="text-muted-500">
                In Azahar:{" "}
                <span className="text-muted-300">
                  Emulation → Configure… → System → System
                </span>
              </div>
              <div className="mt-2">
                <div className="text-muted-400 mb-1">Username :</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={playerName || "your_username"}
                    className="bg-muted-900 text-warning-400 border border-border px-2 py-1 flex-1 focus:outline-none"
                  />
                  <button
                    onClick={() => copy(playerName || "your_username", "username")}
                    className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-3 py-1 border border-primary-700 shrink-0"
                  >
                    {copied === "username" ? "Copied!" : "COPY"}
                  </button>
                </div>
                <div className="text-danger-400 text-[10px] mt-1">
                  Must match your registered username on this site
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-success-500 font-bold text-lg shrink-0">
              ✓
            </span>
            <div className="space-y-1">
              <div className="text-muted-200 font-bold">Connect to a Room</div>
              <div className="text-muted-500">
                In Azahar: go to{" "}
                <span className="text-muted-300">
                  Multiplayer → Direct Connect to Room
                </span>{" "}
                and paste the room address copied above.
              </div>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
};