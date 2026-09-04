import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Window } from "../components/Window";
import { API } from "../config";
import { registerSchema } from "../schemas/auth";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = registerSchema.safeParse({ username, password });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError(firstIssue?.message || "Invalid registration form");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("azahar_player_jwt", data.token);
        sessionStorage.setItem("azahar_player_name", data.username);
        setGeneratedToken(data.citraToken);
      } else {
        const msg = await res.text();
        setError(msg || "Registration failed");
      }
    } catch {
      setError("Unable to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (generatedToken) {
    return (
      <div className="max-w-md mx-auto p-4 mt-10">
        <Window title="ACCOUNT CREATED">
          <div className="font-mono text-xs space-y-4">
            <div className="text-success-500">
              ✓ Account created: {username}
            </div>
            <div className="text-muted-400">
              Your <b>Network Token</b> (to paste in the emulator):
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 flex items-center">
                <input
                  readOnly
                  type="text"
                  value={showToken ? generatedToken : "••••••••••••••••"}
                  className="bg-muted-900 border border-primary-700 p-2 pr-8 text-primary-400 w-full focus:outline-none"
                />
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
              </div>
              <button
                onClick={() => copyToken(generatedToken)}
                className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-3 py-2 border border-primary-700 shrink-0"
              >
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>
            <div className="text-muted-600 text-[10px]">
              In Azahar/Citra: Multiplayer → Network → API URL:{" "}
              {`${window.location.origin}/api`} + your Network Token above.
            </div>
            <button
              onClick={() => navigate("/")}
              className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-4 py-2 border border-primary-700 w-full"
            >
              CONTINUE → ROOMS
            </button>
          </div>
        </Window>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 mt-10">
      <Window title="PLAYER REGISTRATION">
        <form onSubmit={submit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="text-muted-400">username</label>
            <input
              className="bg-muted-900 text-muted-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-primary-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 chars (letters, numbers, _, -)"
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-muted-400">password</label>
            <input
              type="password"
              className="bg-muted-900 text-muted-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-primary-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              disabled={loading}
            />
          </div>
          {error && <div className="text-danger-400">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-4 py-2 border border-primary-700 w-full disabled:opacity-50"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
          <div className="text-center text-muted-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-400 hover:underline">
              sign in
            </Link>
          </div>
        </form>
      </Window>
    </div>
  );
};