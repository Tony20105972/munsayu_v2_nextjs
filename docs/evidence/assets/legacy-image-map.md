# 레거시 공개 이미지 지도 — EV-0012

> 수집: 2026-11-11, 사용자 승인 범위(munsayu.com GET, 요청 간격 1.2초, 이미지 파일만).
> 공개 페이지 11개의 HTML을 GET으로 받아 `<img src/alt/class>`와 CSS `url(...)`을 추출했다.
> 쓰기 요청·폼 제출·로그인은 없었고, robots.txt 금지 경로(`/uAdmin/`)는 건드리지 않았다.
>
> 원본은 `legacy-assets-raw/`(gitignore), 중복 제거·EXIF 제거본은 `legacy-assets-clean/`(gitignore)에 있고,
> 화면에서 쓰는 것만 `public/images/` 아래로 커밋한다.

## 요약

| 구분 | 개수 | 비고 |
|---|---|---|
| 내려받은 파일 | 57 | 전부 HTTP 200, MIME `image/*` 확인 |
| 고유 파일(md5 기준) | 41 | 중복 16개 |
| 중복 묶음 | 14 | 강사 사진이 팀별로 두 번 업로드돼 있다 (ASM-003 뒷받침) |
| 외부 호스트 직링크 | 7 (슬롯 9개) | `images.unsplash.com` — 내려받지 않음 |

## 확인한 사실

- **강사 사진은 같은 파일이 두 이름으로 중복 업로드돼 있다.** `/sub/abouttch1`은 `KYH_`·`KMJ_` 형식,
  `/sub/abouttch2`는 `KimYH_`·`KimMJ_` 형식을 쓰는데 md5가 같다. 같은 강사가 팀별로 따로 등록된
  관리자 화면 관찰(EV-ADM-04, ASM-003)과 일치한다.
- **`석혜선 선생님 사진`과 `문해와 사유 사진`은 바이트 단위로 같은 파일이다**(4개 경로가 같은 md5).
  한 이미지를 두 자리에 쓰고 있어 자리표시용으로 보인다. 실제 사진이 필요하면 원장님 확인이 필요하다.
- **`/sub/Facility`와 `/sub/about`의 일부 이미지는 `images.unsplash.com` 직링크다.** 학원 소유가 아니며
  승인 범위(munsayu.com)에도 없어 내려받지 않았다.
- **munsayu.com에 올라와 있는 `photo-<숫자>-<해시>` 형식 파일도 Unsplash 사진 ID와 일치한다.**
  (`photo-1541339907198-e08756dedf3f`는 Facility 페이지의 Unsplash 직링크와 같은 ID)
  사용자 지시에 따라 사용은 유지하고 권리는 `Unsplash 추정(출처 확인 필요)`로 기록한다.
- **`/sub/abouttch3`에는 강사 사진이 없다.** 로고와 공통 배경만 있다.
- 강사 사진 4개(`CJN`, `ChoiJN`, `SSJ`, `ShinSJ`)에 GPS EXIF 태그가 있었다. 촬영 위치가 남는 개인
  정보이므로 커밋본에서는 APPn 메타데이터 세그먼트를 제거했다(픽셀 재인코딩 없음, 형식 유지).
- 원본 2개가 각각 23MB·16MB다. 용량 최적화는 Phase 6 범위라 형식·화질을 그대로 커밋한다.

## 페이지별 원문 추출 결과

## /
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/yef-xduL0xdx3oBr-RFkYO1p9jQKo7wK62sHZYx4SlGiEATz78rYXbC3E6pcO9ishYMrPNkBXOlCl87jB4yZrcZ7h79DY13hqOUB5fEEJ7KYeWwRAfDFVcLrOsplGSt6BzOGI8Gro5nYPXe1V_sSJYiMX5QA3vhMY3RDfJEXTU8.jpeg | alt="" | class=""
- css-bg | https://munsayu.com/img/photo-1497633762265-9d179a990aa6.avif | alt="" | class=""
- css-bg | https://munsayu.com/img/n3b1pYX9Kg-yD9uQIcnM7-ermrdLtOtegMbTDir9UsK5kqbtx7peazWbbA43uChUV0aZYvlCHSrUgG17n_StH5krtPk6c_dTatZyuuFlhT6ovAL-7o1IMfB_11NZ68NDYtyOcIe5zbiSsWVa4MyTUlFAsm9GqJDFzG23bslk95U.jpeg | alt="" | class=""

## /sub/Check
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/Facility
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_01.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_03.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_04.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_06.jpg | alt="" | class=""
- img | https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80 | alt="절제된 색감과 따뜻한 소재" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80 | alt="시야가 이어지는 공간" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1517502884422-41eaacad0168?auto=format&fit=crop&w=800&q=80 | alt="책과 글을 위한 교실" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80 | alt="역할이 분명한 동선" | class="img-fluid object-fit-cover"
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_09.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_10.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_11.jpg | alt="" | class=""
- img | https://munsayu.com/sub/img/KakaoTalk_20261012_130514336_13.jpg | alt="" | class=""
- img | https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80 | alt="책과 가까워지는 북카페" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80 | alt="편안하게 머무는 독서 자리" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80 | alt="아이의 움직임까지 세심하게" | class="img-fluid object-fit-cover"
- img | https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80 | alt="머무는 시간 내내 쾌적하게" | class="img-fluid object-fit-cover"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/Location
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/Presentation
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/about
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- img | https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80 | alt="문사유 수업현장" | class="img-fluid rounded-4 shadow"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/abouttch1
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- img | https://munsayu.com/data/instructor/KYH_1793243080.jpg | alt="김윤환 원장 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KMJ_1793241769.jpg | alt="김민주 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KBM_1793241895.jpg | alt="김보민 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KSH_1793242005.jpg | alt="김세현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KJM_1793242169.jpg | alt="김지민 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/PSM_1793242252.jpg | alt="박선미 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/SSJ_1793242473.jpg | alt="신서진 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/YH_1793243069.jpg | alt="유 현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/WDH_1793243391.jpg | alt="원다현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/JGW_1793243458.jpg | alt="정건우 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/CEJ_1793246279.jpg | alt="최은지 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/CJN_1793553113.jpg | alt="최지나 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/SHS_1793769158.jpg | alt="석혜선 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/MSY_1793246393.jpg | alt="문해와 사유 사진" | class="real-img"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/abouttch2
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- img | https://munsayu.com/data/instructor/KimYH_1793243090.jpg | alt="김윤환 원장 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KimMJ_1793241822.jpg | alt="김민주 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KimBM_1793241937.jpg | alt="김보민 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KimSH_1793242093.jpg | alt="김세현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/KimJM_1793242207.jpg | alt="김지민 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/ParkSM_1793242300.jpg | alt="박선미 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/ShinSJ_1793242459.jpg | alt="신서진 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/YooH_1793243352.jpg | alt="유 현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/WonDH_1793243415.jpg | alt="원다현 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/JungGW_1793243521.jpg | alt="정건우 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/ChoiEJ_1793246311.jpg | alt="최은지 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/ChoiJN_1793553236.jpg | alt="최지나 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/SeokHS_1793769270.jpg | alt="석혜선 선생님 사진" | class="real-img"
- img | https://munsayu.com/data/instructor/MunSY_1793246420.jpg | alt="문해와 사유 사진" | class="real-img"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/abouttch3
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/schedule.g
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""

## /sub/schedule.n
- img | https://munsayu.com/seo/logo_munsau.png | alt="문사유 아카데미 로고" | class="main-header-logo"
- css-bg | https://munsayu.com/img/photo-1541339907198-e08756dedf3f.avif | alt="" | class=""
