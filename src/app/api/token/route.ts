// src/app/api/token/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return new Response(JSON.stringify({ error: "No token found" }), {
      status: 401,
    });
  }

  console.log("JWT token on server:", token); // ✅ logs in server console

  return new Response(JSON.stringify(token), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
