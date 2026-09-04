import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Window } from "../components/Window";
import { API } from "../config";
import { loginSchema } from "../schemas/auth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError(firstIssue?.message || "Invalid login form");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("azahar_player_jwt", data.token);
        sessionStorage.setItem("azahar_player_name", data.username);
        navigate("/");
      } else {
        const msg = await res.text();
        setError(msg || "Invalid credentials");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 mt-10">
      <Window title="PLAYER LOGIN">
        <form onSubmit={submit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="text-muted-400">username</label>
            <input
              className="bg-muted-900 text-muted-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-primary-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              disabled={loading}
            />
          </div>
          {error && <div className="text-danger-400">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-900 hover:bg-primary-800 text-primary-100 px-4 py-2 border border-primary-700 w-full disabled:opacity-50"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
          <div className="text-center text-muted-500">
            No account?{" "}
            <Link to="/register" className="text-primary-400 hover:underline">
              register
            </Link>
          </div>
        </form>
      </Window>
    </div>
  );
};
