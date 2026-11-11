import { listCampuses } from "@/server/services/courses";
import { errorResponse, jsonNoStore } from "@/server/http";

export async function GET(): Promise<Response> {
  try {
    return jsonNoStore({ items: await listCampuses() }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
