# 증거 원장

| ID | 일시 | 등급 | 출처 | 요약 | 파일 |
|---|---|---|---|---|---|
| — | — | — | — | Phase 1에서 작성 | — |
| EV-0001 | 2026-11-06 | OBSERVED | REA | localhost Next.js 페이지 관찰 | `rea/phase-0-localhost.md` |
| EV-0002 | 2026-11-09 | OBSERVED | curl GET | `https://munsayu.com/robots.txt`: `/uAdmin/` 조사 금지 | `robots.txt` |
| EV-0003 | 2026-11-09 | OBSERVED | Playwright MCP + REA | 공개 홈 화면·경로 후보·DOM 관찰 | `screenshots/phase1-home-1440.png`, `dom/phase1-home.yml`, `rea/phase-1-home.md` |
| EV-0004 | 2026-11-09 | OBSERVED | curl GET | `https://munsayu.com/sitemap.xml`은 HTTP 404. robots 금지 경로 외 공개 경로는 홈·공개 메뉴·푸터에서 수집 | `legacy/legacy-route-map.json` |
| EV-0005 | 2026-11-09 | OBSERVED | Playwright MCP + REA | 설명회 목록: 지점별 일정, `접수마감` 상태·비활성 버튼 관찰. REA 페이지 증거 `ev_412483d3a5c5e5c22c59482f628c8919d7bdc498a38bb67701f207bc9d16b4df`; 번들 분석은 시간 제한으로 부분 증거 `ev_af4ff308bc0cde822013eb06a8ced2e9c00f7a5b171fae46680008031be7c9a1` | `screenshots/phase1-presentation-1440.png`, `screenshots/phase1-presentation-390.png`, `dom/phase1-presentation.yml`, `har/phase1-presentation-network.md` |
| EV-0006 | 2026-11-09 | OBSERVED | Playwright MCP | 대치본원 강좌 수강예약 모달의 선택 강좌·학생명·학부모 연락처·학교·과정·학년·필수 동의·보유기간 관찰(입력·제출 없음) | `screenshots/phase1-course-1440.png`, `screenshots/phase1-course-390.png`, `screenshots/phase1-course-reservation-390.png`, `dom/phase1-course.yml`, `dom/phase1-course-reservation-dialog.yml`, `har/phase1-course-network.md` |
| EV-0007 | 2026-11-09 | OBSERVED | Playwright MCP | 공개 그누보드형 로그인·가입 약관·공지 목록 화면 및 URL 형식 관찰(로그인·가입·제출 없음) | `screenshots/phase1-login-1440.png`, `screenshots/phase1-register-1440.png`, `screenshots/phase1-notice-1440.png`, `dom/phase1-login.yml`, `dom/phase1-register.yml`, `dom/phase1-notice.yml`, `har/phase1-login-network.md`, `har/phase1-notice-network.md` |
| EV-0008 | 2026-11-09 | OBSERVED | Playwright MCP | 강좌 예약 form DOM 계약 및 공개 설명회 예약 조회/취소 화면 관찰(입력·조회·취소 없음) | `dom/phase1-course-form-contract.json`, `dom/phase1-course-contract.yml`, `dom/phase1-check.yml`, `har/phase1-final-network.md` |
| EV-0009 | 2026-11-09 | OBSERVED | Playwright MCP | 공개 페이지 형식별 1440/390 증거(학원·위치·시설·강사·분당 시간표·예약조회) 및 강사 대표 공개 정보 | `screenshots/phase1-*-1440.png`, `screenshots/phase1-*-390.png`, `dom/phase1-{about,location,facility,teachers,schedule-g,check}.yml` |
| EV-0010 | 2026-11-09 | OBSERVED | REA + curl GET | 강좌 예약 인라인 JS: `./reserve_lecture_update.php` POST, `$form.serialize()` 전송, `tt_id` 클라이언트 검사 | `rea/phase1-schedule-n.md`, `rea/phase1-schedule-n-source.html` |
| EV-ADM-01 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 관리자 로그인 화면 | `../photo/스크린샷 2026-11-06 오후 8.41.36.png` |
| EV-ADM-02 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 회원관리 화면 | `../photo/스크린샷 2026-11-06 오후 8.41.47.png` |
| EV-ADM-03 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 설명회관리 화면 | `../photo/스크린샷 2026-11-06 오후 8.41.58.png` |
| EV-ADM-04 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 강사관리 화면 | `../photo/스크린샷 2026-11-06 오후 8.42.07.png` |
| EV-ADM-05 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 시간표관리 화면 | `../photo/스크린샷 2026-11-06 오후 8.42.18.png` |
| EV-ADM-06 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 접속자집계 화면 | `../photo/스크린샷 2026-11-06 오후 8.42.29.png` |
| EV-ADM-07 | 2026-11-06 | OBSERVED-USER | 사용자 제공 화면 | 접속자검색 화면 | `../photo/스크린샷 2026-11-06 오후 8.42.36.png` |
