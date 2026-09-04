import { useEffect, useState } from "react";
import { Window } from "../components/Window";
import { API } from "../config";

interface Profile {
  username: string;
  citraToken?: string;
  createdAt: number;
  minutesOnline: number;
}

export const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const name = sessionStorage.getItem("azahar_player_name");
    if (!name) return;
    const jwt = sessionStorage.getItem("azahar_player_jwt");
    const headers: Record<string, string> = {};
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    fetch(`${API}/player/${name}`, { headers })
      .then((res) => res.json())
      .then(setProfile)
      .catch(() => setError("Profile not found"));
  }, []);

  const logout = () => {
    sessionStorage.removeItem("azahar_player_jwt");
    sessionStorage.removeItem("azahar_player_name");
    window.location.href = "/";
  };

  if (!profile)
    return (
      <div className="p-4 font-mono text-xs text-muted-500">
        {error || "Loading..."}
      </div>
    );

  const hours = Math.floor(profile.minutesOnline / 60);
  const mins = profile.minutesOnline % 60;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Window title={`PROFILE: ${profile.username.toUpperCase()}`}>
        <div className="font-mono text-xs space-y-2">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-500">username</span>
            <span className="text-primary-400">{profile.username}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-500">citra_token</span>
            <span className="text-muted-300 break-all">
              {profile.citraToken ? profile.citraToken : "not set"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-500">member since</span>
            <span className="text-muted-300">
              {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-500">playtime</span>
            <span className="text-success-500">
              {hours}h {mins}min
            </span>
          </div>
          <div className="pt-4">
            <button
              onClick={logout}
              className="bg-muted-800 hover:bg-muted-700 text-danger-400 px-4 py-2 border border-border"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </Window>
    </div>
  );
};
