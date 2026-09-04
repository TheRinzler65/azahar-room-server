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
  const [copied, setCopied] = useState("");
  const [showToken, setShowToken] = useState(false);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

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
        <div className="font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-muted-500">username</span>
            <span className="text-primary-400">{profile.username}</span>
          </div>
          
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-muted-500">citra_token</span>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  readOnly
                  type="text"
                  value={
                    profile?.citraToken
                      ? showToken
                        ? profile.citraToken
                        : "••••••••••••••••"
                      : "not set"
                  }
                  className="bg-muted-900 text-warning-400 border border-border px-2 py-1 pr-8 w-48 sm:w-64 focus:outline-none"
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
          </div>

          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-muted-500">member since</span>
            <span className="text-muted-300">
              {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center border-b border-border pb-2">
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