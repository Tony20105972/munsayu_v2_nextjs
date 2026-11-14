# EV-0015 — Phase 5 레거시 동등성 관찰 (GET 전수)

- 날짜 2026-11-14 · 등급 `OBSERVED` · 도구 REA `list_browser_targets`/`inspect_web_page` + Playwright + curl GET
- 공개 경로 16개를 **GET 으로만** 받아 저장했다. 요청 사이 1초를 쉬었고 폼 제출·업로드·관리자 경로 접근은 하지 않았다.
- 원본 HTML 은 강사 실명이 들어 있어 저장소에 넣지 않는다(`.tmp/parity/`, 커밋 제외).
  이 파일에는 실명을 `○○○ 선생님` 으로 가려 적는다. (CLAUDE.md 4장)

## 1. title·description·canonical 전수 (legacy-seo-map.md 의 UNKNOWN 해소)

| 기능 | 레거시 경로 | 레거시 title | 레거시 description |
|---|---|---|---|
| PG-001 | `/` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-002 | `/sub/about` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-003 | `/sub/Location` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-004 | `/sub/Facility` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-005 | `/sub/abouttch1` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-006 | `/sub/abouttch2` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-007 | `/sub/abouttch3` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-008 | `/sub/schedule.n` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-009 | `/sub/schedule.g` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-010 | `/sub/Presentation` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-011 | `/sub/Check` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-012 | `/bbs/board.php?bo_table=notice` | 공지사항  페이지 | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-013 | `/bbs/login.php` | 로그인 | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| PG-014 | `/bbs/register.php` | 회원가입약관 | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| RT-002 | `/bbs/password_lost.php` | 회원정보 찾기 | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |
| AD-011 | `/sub/Recruit` | 문해와 사유(초등독서논술학원) | 대치동 문사유 초등관. 초등 독서논술, 문해력·사고력 완성, 1:1 맞춤 글쓰기 클리닉 및 최신 시간표 안내… |

- 레거시는 **모든 페이지가 같은 description·og:description** 을 쓴다.
- `canonical` 링크는 **한 페이지에도 없다.**
- `/` 와 `/sub/*` 11개의 title 이 모두 `문해와 사유(초등독서논술학원)` 로 같다. 그누보드 화면만 페이지별 title 이 있다.

## 2. 주 메뉴 마크업 (ASM-040 해소)

```
학원안내     학원소개 /sub/about · 오시는길 /sub/Location · 시설안내 /sub/Facility · 공지사항 /bbs/board.php?bo_table=notice
강사진안내   대치팀 /sub/abouttch1 · 분당팀 /sub/abouttch2      (컨설팅팀 /sub/abouttch3 은 HTML 주석으로 꺼 둠)
시간표       대치본원 /sub/schedule.n · 분당점 /sub/schedule.g  (전체보기 는 주석)
설명회       현장 설명회 예약 /sub/Presentation                 (설명회 다시보기 는 주석)
예약확인/신청 수강신청 /sub/schedule.n · 예약확인/취소 /sub/Check
```

## 3. `/sub/abouttch3` 의 정체 (ASM-043 반증)

레거시 `/sub/abouttch3` 은 **문해력 진단 안내 화면이 아니다.** 강사진 안내 껍데기
(`강사진 안내` / `대치동 최정예 대표강사 라인업` / `PRO 강사진`)에 강사 카드가 비어 있는
「컨설팅팀」 화면이고, 메뉴에서는 주석으로 꺼져 있다. 그 화면의 `문해력 진단 신청` 문구는
푸터 RESERVE 묶음의 링크다.

## 4. 공개 폼 전수

| 기능 | 경로 | 레거시 form action | 전송 항목 |
|---|---|---|---|
| PG-002 | `/sub/about` | `./about.php` (POST) | action, parent_name, phone, student_grade, inquiry_type, message |
| PG-008 | `/sub/schedule.n` | `javascript:void(0);` (POST) | tt_id, campus, rl_name, rl_hp, rl_school, department, grade |
| PG-009 | `/sub/schedule.g` | `javascript:void(0);` (POST) | tt_id, campus, rl_name, rl_hp, rl_school, department, grade |
| PG-010 | `/sub/Presentation` | `javascript:void(0);` (POST) | pgr_id, wr_name, wr_hp, wr_school, wr_count, grade |
| PG-011 | `/sub/Check` | `/sub/Check.php` (POST) | res_name, res_hp |
| PG-012 | `/bbs/board.php?bo_table=notice` | `https://munsayu.com/bbs/board_list_update.php` (POST) | bo_table, sfl, stx, spt, sca, sst, sod, page, sw |
| PG-012 | `/bbs/board.php?bo_table=notice` | `None` (GET) | bo_table, sca, sop, sfl, stx |
| PG-013 | `/bbs/login.php` | `https://munsayu.com/bbs/login_check.php` (POST) | url, mb_id, mb_password, auto_login |
| PG-014 | `/bbs/register.php` | `https://munsayu.com/bbs/register_form.php` (POST) | agree, agree2, chk_all |
| RT-002 | `/bbs/password_lost.php` | `https://munsayu.com/bbs/password_lost2.php` (POST) | cert_no, mb_email, captcha_key |
| AD-011 | `/sub/Recruit` | `./recruit_update.php` (POST) | token, wr_name, wr_link1, wr_email, wr_1, wr_2, wr_3[], wr_4[], wr_5[], wr_subject, wr_content, wr_6, file_resume, file_portfolio |

홈(`/`)은 `<form>` 없이 입력 4개(`학년·학생 이름·학교명·보호자 연락처`)만 두고
JS 로 `./sms_subscribe.ajax.php` 에 보낸다. (AD-010, EV-0003 과 같음)

## 5. 홈 화면에서 신규 구현에 빠져 있던 문구

- 배너 슬라이드 2 `아이의 생각을 듣고, 다음 질문을 이끄는 강사진` (EXPERT TEACHERS & CURRICULUM, 버튼 `강사진·교육 철학 보기` → `/sub/abouttch1`)
- 배너 슬라이드 3 `질문으로 생각을 넓히고, 토론과 글쓰기로 다듬습니다` (THINKING & WRITING CLINIC, 버튼 `토론·글쓰기 과정 보기` → `/sub/about`)
- 섹션 `문사유만의 4대 차별화 시스템` 과 카드 4개 전체
- PROJECT COSMO 의 `COSMO: CORE (어휘) / 모든 힘의 근원이 되는 단단한 중심핵`,
  `COSMO: FLARE (독서) / 세상 밖으로 터뜨리는 폭발적 확장`, 단어쌍 비교 `우리 아이는 이 차이를 설명할 수 있을까요?`

홈 배너 1번의 `문해력 진단 신청` 버튼은 레거시에서 `https://forms.gle/hB9ViXT51HkRUkjU7` 로 나간다.
`/sub/abouttch3` 푸터의 진단 신청 주소(`https://forms.gle/XUjFY9jVStQDKskg8`, EV-0013)와 **다르다.**

## 6. `/sub/about` 의 상담·진단 신청 폼

레거시 `/sub/about` 에는 사이트 안에서 바로 내는 신청 폼이 있다.

- `POST ./about.php` · `action=submit_inquiry`
- 학부모 성함*, 연락처*, 자녀 학년(select), 신청 유형(select: `COSMO 스펙트럼 진단평가 예약` / `수업 및 입학 일반 상담`), 문의 및 요청사항(textarea)
- 버튼 `상담 및 진단평가 신청하기`
- 같은 구역에 `운영 시간: 평일 14:00-22:00 / 주말 08:30-22:00` 이 적혀 있다. 푸터의
  `상담시간: 월-금 13:00-21:00 / 토·일 9:30-21:00` 과 **다르다.**

이는 `legacy-form-contracts.md` 의 「사이트 안에는 신청 폼이 없다」와 어긋난다. AD-009 관리자
목록에 신청이 들어오는 경로가 이 폼이다(그동안 `UNKNOWN` 이었다).

## 7. robots.txt·sitemap

- 레거시 `/robots.txt` = `User-agent: *` / `Disallow: /uAdmin/` (EV-0002 와 같음). 신규 앱에는 파일이 없어 404 였다.
- 레거시 `/sitemap.xml` 404 (EV-0004 와 같음). 신규도 없다.

## 8. 화면 크기 (전체 높이, px)

| 기능 | 1440 레거시 | 1440 신규 | 390 레거시 | 390 신규 |
|---|---|---|---|---|
| PG-001 | 1440x7208 | 1440x6221 | 780x14052 | 390x9981 |
| PG-002 | 1468x5638 | 1440x4315 | 780x9378 | 390x5961 |
| PG-003 | 1480x2799 | 1440x1788 | 780x4239 | 390x2617 |
| PG-004 | 1440x2657 | 1440x2604 | 780x3678 | 390x3884 |
| PG-005 | 1440x5874 | 1440x1802 | 780x14088 | 390x3570 |
| PG-006 | 1440x5874 | 1440x1858 | 780x14088 | 390x2913 |
| PG-007 | 1440x1278 | 1440x1521 | 780x1936 | 390x2038 |
| PG-008 | 1440x2075 | 1440x2090 | 780x3664 | 390x3221 |
| PG-009 | 1440x2075 | 1440x1322 | 780x3664 | 390x1989 |
| PG-010 | 1440x2714 | 1440x1898 | 780x4224 | 390x2569 |
| PG-011 | 1440x1858 | 1440x1667 | 780x2816 | 390x2330 |
| PG-012 | 1440x1252 | 1440x1189 | 780x1918 | 390x1604 |
| PG-013 | 1440x900 | 1440x1318 | 390x844 | 390x1733 |
| PG-014 | 1440x2000 | 1440x1757 | 780x2803 | 390x2268 |
| RT-002 | 1440x1473 | 1440x1282 | 780x2061 | 390x2103 |
| AD-011 | 1440x3091 | 1440x2607 | 780x4581 | 390x3240 |

레거시는 390 폭에서 문서 너비가 **780px** 로 넘친다(가로 스크롤). 신규는 390 에 맞춘다.
그래서 390 화면은 1:1 픽셀 비교가 성립하지 않는다.
