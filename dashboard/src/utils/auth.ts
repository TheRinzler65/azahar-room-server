export function authHeaders(
  additional: Record<string, string> = {},
): HeadersInit {
  return {
    Authorization: `Bearer ${sessionStorage.getItem("azahar_admin_jwt")}`,
    "Content-Type": "application/json",
    ...additional,
  };
}

export function playerAuthHeaders(
  additional: Record<string, string> = {},
): HeadersInit {
  return {
    Authorization: `Bearer ${sessionStorage.getItem("azahar_player_jwt")}`,
    "Content-Type": "application/json",
    ...additional,
  };
}
