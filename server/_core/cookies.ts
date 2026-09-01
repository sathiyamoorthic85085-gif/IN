export function getSessionCookieOptions(req: { protocol?: string } = {}) {
  const isSecure = req.protocol === "https" || process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: (isSecure ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}
