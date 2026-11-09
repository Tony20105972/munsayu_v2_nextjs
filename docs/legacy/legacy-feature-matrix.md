# 레거시 기능 매트릭스 — Phase 1

| ID | 기능 | 근거 등급 | 관찰 요약 | 관리자 연결 |
|---|---|---|---|---|
| PG-001 | 홈 | OBSERVED | 공개 메뉴·푸터·로그인/가입 링크 | — |
| PG-008/009 | 대치·분당 시간표 | OBSERVED/UNKNOWN | 대치 `/sub/schedule.n`에서 강좌 카드·예약 모달 관찰. 분당은 메뉴 링크만 관찰 | AD-007, AD-008 |
| PG-010 | 설명회 | OBSERVED | 지점별 설명회 목록과 마감 상태 | AD-003~005 |
| PG-012 | 공지 목록 | OBSERVED | `/bbs/board.php?bo_table=notice`, 상세 URL 형식 `&wr_id={id}` | 콘텐츠 관리 범위 확인 필요 |
| PG-013/014 | 공개 로그인·가입 | OBSERVED | `/bbs/login.php`, `/bbs/register.php`, 비밀번호 찾기 링크 | AD-002 |
| FM-001 | 강좌 수강 예약 | OBSERVED | 필드·동의·보유기간 관찰, 제출 미수행 | AD-008, AD-013 |
| FM-002 | 설명회 예약 | OBSERVED/UNKNOWN | 마감 UI 관찰; 접수 가능 폼은 미관찰 | AD-003~005 |
| FM-003 | 회원 로그인·가입 | OBSERVED/UNKNOWN | 화면 구조만 관찰 | AD-002 |
| BZ-001 | 설명회 마감 표시 | OBSERVED | `접수마감` 및 disabled 버튼 | AD-004 |
| BZ-002 | 강좌 개인정보 보유 | OBSERVED | 종강·정규 등록 안내 완료 시 즉시 파기 문구 | AD-013 |
| AD-007/008 | 시간표·강좌 신청 관리 | OBSERVED-USER + OBSERVED | 사용자 제공 관리자 화면과 공개 시간표·예약 모달 연결 | EV-ADM-05, EV-0006 |
| AD-009 | 입학진단 | 확정(사용자 답변) | Google Forms 외부 링크 연결만, 신규 구현 없음 | EV-0006, EV-0007 |
| AD-010 | 문자신청내역 | UNKNOWN | 공개 화면에서 범위 미확정 | Q-ADM-07, Q-ADM-11 |
| AD-011 | 강사지원 | UNKNOWN | 공개 화면에서 범위 미확정 | Q-ADM-07 |
| PG-011 | 설명회 예약 조회/취소 | OBSERVED | 학생 이름·보호자 휴대폰 조회 UI와 취소/알림 안내 문구 | EV-0008 |
