"use client";

import { useId, useState } from "react";
import { CourseReservationDialog } from "@/components/public/course-reservation-dialog";
import type { CourseCardView, CourseGroupView } from "@/lib/view-models";

/**
 * PG-008·PG-009 시간표 목록과 FM-001 예약 모달 연결.
 * 카드 구성(머리글·강좌명·강의시간·개강일·상세보기·수강예약)은
 * docs/evidence/dom/phase1-course.yml, phase1-schedule-g.yml 관찰값이다.
 */
export function Timetable({
  groups,
  retentionPolicy,
}: {
  groups: readonly CourseGroupView[];
  /** 관리자 보존 설정의 현재 문구. 신청 모달의 「보유기간」에 그대로 쓴다. (BZ-002) */
  retentionPolicy: string;
}) {
  const [selectedCourse, setSelectedCourse] = useState<CourseCardView | null>(null);

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="rounded-xl border border-line bg-surface px-5 py-6 text-sm text-muted">
          등록된 강좌가 없습니다. 상담센터로 문의해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.gradeTitle}>
            <h2 className="border-l-4 border-accent bg-surface px-5 py-4 text-base font-bold text-ink">
              {group.gradeTitle}
            </h2>
            <ul className="mt-4 space-y-3">
              {group.courses.map((course) => (
                <li key={course.id}>
                  <CourseCard
                    course={course}
                    onReserve={() => setSelectedCourse(course)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {selectedCourse ? (
        <CourseReservationDialog
          course={selectedCourse}
          retentionPolicy={retentionPolicy}
          onClose={() => setSelectedCourse(null)}
        />
      ) : null}
    </div>
  );
}

function CourseCard({
  course,
  onReserve,
}: {
  course: CourseCardView;
  onReserve: () => void;
}) {
  const detailId = useId();
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <article className="rounded-xl border border-line bg-surface px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:flex lg:flex-1 lg:items-center lg:gap-6">
          <p className="text-sm font-bold text-brand lg:w-32">{course.sectionTitle}</p>
          <h3 className="mt-1 text-base font-bold text-ink lg:mt-0 lg:flex-1">
            {course.title}
          </h3>
          <p className="mt-2 text-sm lg:mt-0">
            <span className="mr-2 text-xs font-bold text-muted">강의시간</span>
            <span className="font-bold text-ink">{course.scheduleText}</span>
          </p>
          <p className="mt-1 text-sm lg:mt-0">
            <span className="mr-2 text-xs font-bold text-muted">개강일</span>
            <span className="font-bold text-accent">{course.startDateText}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={detailOpen}
            aria-controls={detailId}
            onClick={() => setDetailOpen((open) => !open)}
            className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/50"
          >
            {detailOpen ? "상세닫기" : "상세보기"}
          </button>
          {course.intakeOpen ? (
            <button
              type="button"
              onClick={onReserve}
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              수강예약
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-line px-4 py-2 text-sm font-bold text-muted"
            >
              접수마감
            </button>
          )}
        </div>
      </div>

      {/* 레거시 `상세보기`의 내용은 관찰하지 못해 카드에 있는 사실만 펼쳐 보여 준다. // ASM-044 */}
      <div
        id={detailId}
        hidden={!detailOpen}
        className="mt-4 rounded-md border border-line bg-canvas px-4 py-3 text-sm text-muted"
      >
        <dl className="space-y-1">
          <div>
            <dt className="inline font-bold text-ink">지점 : </dt>
            <dd className="inline">{course.campusName}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">강좌 : </dt>
            <dd className="inline">{course.title}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">강의시간 : </dt>
            <dd className="inline">{course.scheduleText}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">개강일 : </dt>
            <dd className="inline">{course.startDateText}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">접수 상태 : </dt>
            <dd className="inline">{course.intakeOpen ? "접수중" : "접수마감"}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
