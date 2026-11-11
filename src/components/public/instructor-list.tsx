import Link from "next/link";
import type { InstructorCardView } from "@/lib/view-models";

/**
 * 강사 소개 목록.
 * 이름·소속·약력은 docs/evidence/dom/phase1-teachers.yml 관찰값이다. (EV-0009)
 * 레거시는 사진 위에 마우스를 올리면 `수강 예약하기` 버튼이 나타났는데,
 * 키보드로도 쓸 수 있도록 항상 보이는 링크로 바꾸고 시간표 화면으로 보낸다. // ASM-051
 */
export function InstructorList({
  instructors,
}: {
  instructors: readonly InstructorCardView[];
}) {
  if (instructors.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        등록된 강사 정보가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {instructors.map((instructor) => (
        <li
          key={instructor.id}
          className="flex flex-col rounded-xl border border-line bg-surface p-6"
        >
          <p className="text-xs font-bold text-accent">{instructor.affiliation}</p>
          <h3 className="mt-2 text-lg font-bold text-ink">{instructor.name}</h3>
          <ul className="mt-4 grow space-y-1.5 text-sm leading-relaxed text-muted">
            {instructor.careers.map((career) => (
              <li key={career}>• {career}</li>
            ))}
          </ul>
          <Link
            href="/sub/schedule.n"
            className="mt-5 inline-block rounded-md border border-line px-4 py-2 text-center text-sm font-bold text-brand hover:bg-canvas"
          >
            수강 예약하기
          </Link>
        </li>
      ))}
    </ul>
  );
}
