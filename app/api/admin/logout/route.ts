import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

// POST — logout. Limpa o cookie de sessão do admin.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
