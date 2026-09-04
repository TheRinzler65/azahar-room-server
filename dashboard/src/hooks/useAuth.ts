import { useEffect, useState } from "react";

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!sessionStorage.getItem("azahar_player_jwt"),
  );
  const [playerName, setPlayerName] = useState(
    sessionStorage.getItem("azahar_player_name"),
  );
  const [isAdmin, setIsAdmin] = useState(
    !!sessionStorage.getItem("azahar_admin_jwt"),
  );

  useEffect(() => {
    const sync = () => {
      setIsLoggedIn(!!sessionStorage.getItem("azahar_player_jwt"));
      setPlayerName(sessionStorage.getItem("azahar_player_name"));
      setIsAdmin(!!sessionStorage.getItem("azahar_admin_jwt"));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("azahar-auth", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("azahar-auth", sync);
    };
  }, []);

  const login = (name: string, jwt: string) => {
    sessionStorage.setItem("azahar_player_jwt", jwt);
    sessionStorage.setItem("azahar_player_name", name);
    window.dispatchEvent(new Event("azahar-auth"));
  };

  const logout = () => {
    sessionStorage.removeItem("azahar_player_jwt");
    sessionStorage.removeItem("azahar_player_name");
    window.dispatchEvent(new Event("azahar-auth"));
  };

  const adminLogin = (jwt: string) => {
    sessionStorage.setItem("azahar_admin_jwt", jwt);
    window.dispatchEvent(new Event("azahar-auth"));
  };

  const adminLogout = () => {
    sessionStorage.removeItem("azahar_admin_jwt");
    window.dispatchEvent(new Event("azahar-auth"));
  };

  return {
    isLoggedIn,
    playerName,
    isAdmin,
    login,
    logout,
    adminLogin,
    adminLogout,
  };
}
