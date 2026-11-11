# Phase 2 독립 리뷰

검토 범위: `CLAUDE.md`, `docs/MIGRATION_PLAN.md`, `docs/BLUEPRINT.md`, `docs/legacy/`, `docs/contracts/`, `prisma/schema.prisma`만 읽었다. 구현 코드 및 결정 ADR 본문은 검토 범위 밖이므로, ADR 존재 여부는 파일명 수준에서만 확인했고 내용의 충족 여부는 판정하지 않았다.

## 결론

**Gate: FAIL.** 아래 차단 항목을 같은 Phase에서 계약/스키마에 반영한 뒤 재검토가 필요하다. URL 매핑과 기능 ID 매트릭스의 기본 대응, D1/D2/D4/D5/D9의 계약 반영 방향, AD-002/AD-012의 범위 결정은 전반적으로 일관된다.

## 차단

1. **동시 중복 신청의 원자성 보장이 계약화되지 않았다.**
   - 근거: `architecture.md`는 동일 연락처+대상 활성 기록을 트랜잭션 안에서 확인한다고 하나, `CourseApplication`과 `EventReservation`에는 각각 `@@index([courseId/eventId, phone, status])`만 있고 활성 행을 하나로 제한하는 유니크 제약이 없다. 단순한 읽기-후-쓰기 트랜잭션은 동시 요청에서 둘 다 통과할 수 있다.
   - 영향: Phase 4 Gate의 “같은 연락처의 동시 중복 신청은 1건만 성공”을 보장할 수 없다.
   - 수정: PostgreSQL 부분 유니크 인덱스(대상+연락처, `PENDING`/`CONFIRMED`만)를 Prisma migration SQL로 추가하거나, SERIALIZABLE 격리와 재시도/고유 충돌 처리라는 동등한 보장 방법을 `architecture.md`와 구현·테스트 계약에 명시한다. 취소 뒤 재신청 허용 규칙도 같은 제약에 반영한다.

2. **AD-013의 보존 기간 경과 후 파기를 스키마만으로 판정·실행할 수 없다.**
   - 근거: `PrivacyRetentionSetting.courseRetentionPolicy`는 사람이 읽는 문구이고 `eventRetentionDays`는 nullable이다. `CourseApplication`에는 “종강 및 정규 등록 안내 완료”를 판정할 날짜/상태가 없고, `EventReservation`도 실제 적용할 비-null 기본 보존 기간 또는 정책 버전이 없다. 그러나 BLUEPRINT와 migration matrix는 두 신청 종류 모두 이 설정에 따라 파기한다고 정한다.
   - 영향: Gate의 개인정보 보존 기간 표시와 AD-013의 보존 기간 경과 후 파기 계약이 검증 가능하지 않다.
   - 수정: 강좌 신청 파기 기준을 계산 가능한 필드/이벤트(예: 안내 완료 시각)로 모델링하고, 설명회 기본 보존 기간을 확정된 값으로 비-null화한다. 동의 문구/정책 변경 시 기존 기록에 적용되는 정책을 재현할 수 있도록 정책 버전 또는 적용 기준도 정한다.

3. **예약 조회·취소 API의 OpenAPI 입력 계약이 비어 있다.**
   - 근거: `architecture.md`는 조회에 이름·보호자 연락처·예약 식별자를 요구하지만 `/api/reservations/lookup`에 requestBody/schema가 없다. `/api/reservations/{id}/cancel`에는 `{id}` path parameter 선언도, 본인 확인에 필요한 입력/인증 계약도 없다.
   - 영향: PG-011의 “본인 예약만 요약 반환”, 타인/불일치 404, Zod 서버 입력 경계라는 요구를 API 소비자·구현·테스트가 같은 계약으로 검증할 수 없다.
   - 수정: 두 endpoint에 request/parameter/response schema와 422·404 조건을 추가하고, 취소의 본인 확인 수단(조회 토큰 또는 이름+보호자 연락처+식별자)을 명시한다. 응답은 마스킹된 필드만 정의한다.

## 수정 권장

1. `/// PII` 표기를 완전하게 한다. 신청/예약 레코드의 `department`, `grade`는 이름·연락처와 결합된 학생 속성이며, `AuditLog.actorUserId`와 `filterSummary`도 개인을 식별하거나 검색 조건에 개인정보가 들어갈 수 있다. BLUEPRINT의 “개인정보 컬럼” 원칙에 맞게 주석과 `filterSummary`의 비식별 요약 규칙을 계약화하는 편이 안전하다.

2. `openapi.yaml`의 관리자 endpoint는 권한 실패를 `401`만 명시한다. 세션은 있으나 ADMIN이 아닌 경우의 `403`, CSV의 마스킹되지 않은 개인정보 응답이라는 특성에 맞는 응답 콘텐츠/캐시 금지 계약, purge의 입력·권한·감사 결과를 추가하면 AD-013 보안 검증이 명확해진다.

3. `FM-003`의 회원가입은 레거시에서 실제 다음 단계 필드가 `UNKNOWN`인데, 신규 계약으로 채택한 필드와 탈퇴/복구 토큰의 보존·만료·무효화 규칙은 OpenAPI 또는 별도 인증 계약에 없다. D5/ASM-002 결정의 추적성과 Phase 4 테스트 가능성을 위해 명시한다.

4. Gate는 D1~D5의 **ADR 기록**을 요구한다. `ADR-003-phase-2-decisions-and-asm-policy.md` 파일은 존재하지만 이 리뷰 범위에서는 본문을 열지 않았으므로, Phase 보고서에서 D1·D2·D4·D5 및 D9의 결정과 ADR 위치를 명시적으로 교차참조해 Gate 증빙을 완결한다.

## 참고 및 확인된 정합성

- `legacy-route-map.json`의 공개 경로, 상세 패턴, 외부 Google Forms 링크 및 제외된 `/uAdmin/**`, `/adm/**`는 `route-compatibility-map.json`에서 유지/308/외부 유지/410으로 모두 처리된다. 새 `/admin`을 레거시 관리자 URL로 노출하지 않는 정책도 일치한다.
- `migration-matrix.md`는 PG, FM, BZ, AD, RT 항목에 테스트 계약을 두고 있으며 BLUEPRINT 4.3의 AD-001~008, AD-013을 포함한다. AD-009 외부 링크 유지, AD-010/011 ASM-007 범위 제외, AD-012 분석 ID 자리만 제공한다는 결정도 BLUEPRINT와 일치한다.
- D1 신규 DB/과거 데이터 미이관, D2 PostgreSQL+Prisma, D4 실제 발송 없이 콘솔 어댑터, D5 MEMBER/ADMIN 단일 관리자 역할, D9 정원 차단 없음·참석 1~2명·수동 마감·중복 차단의 방향은 architecture/matrix/schema에 대체로 반영되어 있다.
- Prisma의 idempotency key 유니크 제약, 신청·예약 상태와 취소 시각, 관리자 PII 열람/CSV/파기 감사 action, 기본 자동 파기 비활성화는 의도한 정책과 부합한다. 다만 위 차단 항목을 해결해야 실제 보장이 된다.
