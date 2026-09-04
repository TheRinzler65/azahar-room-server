import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isLoggedIn = !!sessionStorage.getItem("azahar_player_jwt");
  const playerName = sessionStorage.getItem("azahar_player_name");
  const isAdmin = !!sessionStorage.getItem("azahar_admin_jwt");

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `transition-colors font-mono text-xs ${
      isActive(path)
        ? "text-primary-400 border-b border-primary-400 pb-0.5"
        : "text-muted-400 hover:text-primary-400"
    }`;

  return (
    <nav className="bg-muted-950 border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-3 py-2.5">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-300 hover:text-primary-400"
          onClick={() => setIsOpen(false)}
        >
          <span className="tracking-wider font-bold font-mono">
            AZAHAR ROOM SERVER
          </span>
        </Link>

        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="sm:hidden text-muted-400 hover:text-primary-400 focus:outline-none"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop Links */}
        <div className="hidden sm:flex gap-4 items-center">
          <Link to="/" className={linkClass("/")}>
            Rooms
          </Link>
          <Link to="/play" className={linkClass("/play")}>
            Play
          </Link>
          <Link to="/stats" className={linkClass("/stats")}>
            Stats
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-warning-400 hover:text-warning-300 border border-warning-800 px-2 py-0.5 rounded bg-warning-950/50 transition-colors"
            >
              ADMIN
            </Link>
          )}
          {isLoggedIn ? (
            <Link to="/profile" className={linkClass("/profile")}>
              {playerName}
            </Link>
          ) : (
            <>
              <Link to="/login" className={linkClass("/login")}>
                Login
              </Link>
              <Link to="/register" className={linkClass("/register")}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden bg-muted-950 border-t border-border px-3 py-2 flex flex-col gap-2 font-mono text-xs">
          <Link
            to="/"
            className={linkClass("/")}
            onClick={() => setIsOpen(false)}
          >
            Rooms
          </Link>
          <Link
            to="/play"
            className={linkClass("/play")}
            onClick={() => setIsOpen(false)}
          >
            Play
          </Link>
          <Link
            to="/stats"
            className={linkClass("/stats")}
            onClick={() => setIsOpen(false)}
          >
            Stats
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-warning-400 hover:text-warning-300 py-1"
              onClick={() => setIsOpen(false)}
            >
              ADMIN
            </Link>
          )}
          {isLoggedIn ? (
            <Link
              to="/profile"
              className={linkClass("/profile")}
              onClick={() => setIsOpen(false)}
            >
              {playerName}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={linkClass("/login")}
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={linkClass("/register")}
                onClick={() => setIsOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
