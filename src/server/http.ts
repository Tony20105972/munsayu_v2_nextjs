import { ZodError } from "zod";

export function jsonError(status: number, code: string) {
  // Deliberately never expose input values: these can contain PII.
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}
export function invalidResponse(error: unknown) {
  return error instanceof ZodError ? jsonError(422, "INVALID_INPUT") : jsonError(500, "INTERNAL_ERROR");
}
