import { AuthError, requireAdmin } from "@/server/auth";
import { purgeEligible } from "@/server/services/privacy";
import { jsonError } from "@/server/http";
export async function POST() { try { return Response.json(await purgeEligible((await requireAdmin()).id), { headers: { "Cache-Control": "no-store" } }); } catch (e) { return e instanceof AuthError ? jsonError(e.status, e.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN") : jsonError(500, "INTERNAL_ERROR"); } }
