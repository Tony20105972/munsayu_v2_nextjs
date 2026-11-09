# REA/공개 소스 요약 — 강좌 예약

- 대상: `https://munsayu.com/sub/schedule.n`
- REA `inspect_web_page` evidence_id: `ev_3cd1ef40801cb17f1e91f3267a4f0c11d8d54e653743bf659ae4e24057f689c9`
- 결과: 페이지 DOM·스크립트 인벤토리를 관찰했다. REA 출력은 대형 DOM으로 인해 요약만 보관한다.
- 공용 라이브러리: jQuery 1.12.4, jquery-migrate 1.4.1, `common.js`, `wrest.js` (분석 제외).
- 이어서 GET한 같은 공개 페이지의 인라인 예약 처리 코드에서 `./reserve_lecture_update.php` POST를 확인했다. 원문은 `phase1-schedule-n-source.html`에 보관한다.
