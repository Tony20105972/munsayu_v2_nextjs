import { instructorApplicationSchema } from "@/lib/contracts";
import { createInstructorApplication } from "@/server/services/instructor-applications";
import { errorResponse, jsonNoStore } from "@/server/http";
import { validationFailed } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { toFieldErrors } from "@/server/http";

/**
 * AD-011 강사 지원. 제출 서류가 있어 `multipart/form-data` 로 받는다.
 * 형식·용량 검사는 서비스 계층이 파일 내용을 보고 한다. (EV-0014)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "instructor-applications");

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      throw validationFailed({
        _root: ["요청 본문이 multipart/form-data 형식이 아닙니다."],
      });
    }

    const text = (key: string): string => {
      const value = formData.get(key);
      return typeof value === "string" ? value : "";
    };

    const parsed = instructorApplicationSchema.safeParse({
      name: text("name"),
      phone: text("phone"),
      email: text("email"),
      education: text("education"),
      experienceYears: text("experienceYears"),
      specialties: formData.getAll("specialties").filter((v) => typeof v === "string"),
      capabilities: formData
        .getAll("capabilities")
        .filter((v) => typeof v === "string"),
      headline: text("headline"),
      careerDetail: text("careerDetail"),
      coachingDetail: text("coachingDetail"),
      privacyConsent:
        text("privacyConsent") === "true" || text("privacyConsent") === "on",
      idempotencyKey: text("idempotencyKey"),
    });
    if (!parsed.success) {
      throw validationFailed(toFieldErrors(parsed.error));
    }

    const readFile = async (key: string) => {
      const value = formData.get(key);
      if (!value || typeof value === "string" || value.size === 0) return null;
      return { filename: value.name, bytes: new Uint8Array(await value.arrayBuffer()) };
    };

    const resume = await readFile("resume");
    if (!resume) {
      throw validationFailed({ resume: ["이력서 및 자기소개서 파일을 올려 주세요."] });
    }

    const result = await createInstructorApplication(parsed.data, {
      resume,
      portfolio: await readFile("portfolio"),
    });
    return jsonNoStore(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
