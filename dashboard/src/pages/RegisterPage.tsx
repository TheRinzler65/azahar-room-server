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
            <div className="bg-muted-900 border border-primary-700 p-3 text-primary-400 break-all select-all">
              {generatedToken}
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
