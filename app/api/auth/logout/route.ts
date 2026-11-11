import { destroySession } from "@/server/auth";
export async function POST() { await destroySession(); return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }); }
