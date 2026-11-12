# Phase 1 독립 리뷰

## 차단

1. `legacy-assets-raw/`가 `.gitignore`에 없다. 현재 Git 추적 파일에는 없지만, Phase 1 지시의 “raw 자산은 커밋 금지” 보호 장치가 빠져 이후 실수로 원본 이미지가 커밋될 수 있다.

## 수정 권장

1. `legacy-feature-matrix.md`의 AD 연결이 `legacy-admin-screens.md`의 AD-001~013을 완전히 덮지 않는다. AD-001, AD-006, AD-012가 매트릭스에 독립 행 또는 명시적 연결로 없다.
2. DOM/REA 원문에 공개 대표·담당자 이름, 업무 연락처·이메일이 평문으로 남아 있다. 이는 사용자 지시로 공개 정보 보관을 허용받았으나, CLAUDE.md의 증거 가림 원칙과 긴장이 있으므로 공개 사업자 정보 예외를 문서화하거나 원문을 최소화하는 편이 안전하다.

## 참고

- ledger 표본 11개(`robots.txt`, 홈·설명회 스크린샷/DOM/HAR, 예약 DOM 계약, REA 요약, 사용자 제공 화면)를 확인했고 모두 실제 존재한다.
- `docs/evidence/har/`의 네트워크 요약은 동적 요청 0건이며, HAR 파일에 실제 운영 사이트 POST/PUT/DELETE 기록은 없다. `phase1-schedule-n-source.html`의 POST는 관찰한 클라이언트 코드이지 이 세션이 보낸 요청이 아니다.
- `/uAdmin/`·`/adm/`은 route map·정책 문서에서만 발견됐고, 네트워크 증거에 접속 기록은 없다.
- Gate 조정 ADR은 사용자가 승인한 범위(주소 형식별 대표 REA, 클라이언트 계약, 운영자 답변의 Phase 2 이동)를 넘지 않는다.
- 사용자 답변(D1 확인 중, D9, 설명회 신규 설계, Google Forms 유지, 강좌 연락 미구현)은 PHASE·BLUEPRINT·MIGRATION_PLAN에 대체로 일관되게 반영됐다.
