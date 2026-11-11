import { AuthError, requireAdmin } from "@/server/auth";
import { exportApplications } from "@/server/services/privacy";
import { jsonError } from "@/server/http";
export async function GET() { try { const user = await requireAdmin(); const csv = await exportApplications(user.id); return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=applications.csv", "Cache-Control": "no-store" } }); } catch (e) { return e instanceof AuthError ? jsonError(e.status, e.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN") : jsonError(500, "INTERNAL_ERROR"); } }
