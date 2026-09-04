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
  const [showPassword, setShowPassword] = useState(false);

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
            <div className="relative flex items-center mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="bg-muted-900 text-muted-200 border border-border p-2 pr-8 w-full focus:outline-none focus:border-primary-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 text-muted-400 hover:text-muted-200"
                title={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
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