# EV-0018 — 레거시 공지 상세 쪽의 실제 마크업 (그누보드 기본 스킨이 아니다)

- 날짜: 2026-11-15
- 등급: `OBSERVED`
- 방법: `curl -sS` GET 1회 (`https://munsayu.com/bbs/board.php?bo_table=notice&wr_id=1`), 응답 200 / 26,216 bytes
- 범위: **읽기만.** 폼 제출·쓰기 요청 없음. 관리자 경로 미접근. (`CLAUDE.md` 3장)
- 왜 남기는가: `scripts/import-legacy-notices.mjs` 가 제목·작성일을 잘못 뽑고 있었고,
  그 수정의 근거가 이 관찰이다. 옛 사이트를 닫으면 다시 확인할 수 없다.

---

## 1. 관찰한 것

### 1-1. 글 제목은 `<article id="kairos-bo">` 안의 첫 `<h1>`

```html
<header class="sub-header">
  <div class="container">
    <h1 data-aos="fade-up">공지사항</h1>            <!-- 구역 제목. 글 제목이 아니다 -->
    <p data-aos="fade-up" data-aos-delay="100">대치동 논술·구술 합격의 산실, …</p>
  </div>
</header>
<div class="container my-5">
  <article id="kairos-bo" class="container px-0 py-2">
    <header class="pb-3 mb-3 border-bottom">
      <h1 class="h3 fw-bold text-dark lh-base" style="letter-spacing:-0.02em;">문해와 사유 개원 기념 학부모 설명회 안내</h1>
    </header>
```

- `id="bo_v_title"`·`class="bo_v_tit"`(그누보드 기본 스킨) 은 **쪽 어디에도 없다.**
- 쪽에 `<h1>` 이 **두 개** 있고, 먼저 나오는 것은 구역 제목 `공지사항` 이다.
- 사용 스킨: `https://munsayu.com/skin/board/notice/style.css?ver=2610161618` (Bootstrap 5.3 + AOS + Font Awesome 6.4)

### 1-2. 작성자·작성일

```html
<strong class="d-block text-dark fs-6"><span class="sv_member">문사유</span></strong>
<span class="text-secondary opacity-75 mt-1 d-block" style="font-size:12.5px;">
  <i class="fa-regular fa-clock me-1"></i>2026.10.29 13:54&nbsp;&nbsp;&nbsp;
  <i class="fa-regular fa-comment me-1"></i>0건
</span>
```

- 작성일 표기는 **점 구분** `2026.10.29 13:54` 이다. `YYYY-MM-DD` 가 아니다.
- 작성자는 `문사유` 고정 — ASM-070 과 일치한다.
- `if_date`(그누보드 기본) 는 없다.

### 1-3. 본문은 `id="bo_v_con"` 을 유지한다

```html
<div id="bo_v_con" class="lh-lg text-dark fs-6">안녕하세요. 문해와 사유입니다. <br/> … </div>
</section>
```

- 본문 컨테이너 id 만은 그누보드 기본값이 남아 있어 기존 본문 선택자가 맞았다.
- 끝이 `</div> </section>` 이라 가져오기의 **첫 번째** 본문 정규식이 정확히 잡는다.

### 1-4. 첨부 이미지는 본문 **밖**에 있다

```html
<a href="…/data/file/notice/b6c9…png" target="_blank" class="view_image">
  <img src="…/data/file/notice/thumb-b6c9…_835x835.png" alt=""/></a>
<div id="bo_v_con" …>
```

- 글 상단의 설명회 포스터는 `#bo_v_con` **앞**에 있어 본문 가져오기 범위에 들어가지 않는다.
  그래서 가져오기 요약의 「본문 이미지: 0」은 맞는 숫자다.

---

## 2. 이 관찰로 고친 것 (`scripts/import-legacy-notices.mjs`)

| 고친 것 | 고치기 전에 어떻게 됐는가 |
|---|---|
| 제목 선택자에 `<article id="kairos-bo">` 안의 첫 `<h1>` 추가 | 선택자가 모두 어긋나 마지막 수단인 `<title>` 로 떨어졌다 |
| `<title>` 로 떨어진 경우만 첫 `>` 앞까지 자름 | 제목이 `문해와 사유 개원 기념 학부모 설명회 안내 > 공지사항 \| 문해와 사유(초등독서논술학원)` 로 저장될 상태였다 |
| 작성일에 점·슬래시 구분과 한 자리 월/일 허용, 시계 아이콘 쪽을 먼저 봄 | `-` 만 보고 있어 **모든 글의 작성일이 비어 있었다** (`날짜 없음`) |
| `plainText` 가 HTML 엔티티를 되돌리게 함 | `sanitize-html` 이 다시 escape 해 제목에 `&gt;`·`&amp;` 가 글자 그대로 남았다 |

### 고치기 전 dry-run 출력 (그대로)

```
레거시 공지 글 번호 2개를 찾았습니다.
  wr_id=1: [미저장] 문해와 사유 개원 기념 학부모 설명회 안내 &gt; 공지사항 | 문해와 사유(초등독서논술학원) (날짜 없음)
  wr_id=2: [미저장] 추가 설명회 긴급 편성(전타임 마감) &gt; 공지사항 | 문해와 사유(초등독서논술학원) (날짜 없음)
```

### 고친 뒤 dry-run 출력 (그대로)

```
레거시 공지 글 번호 2개를 찾았습니다.
  wr_id=1: [미저장] 문해와 사유 개원 기념 학부모 설명회 안내 (2026-10-29T04:54:00.000Z)
  wr_id=2: [미저장] 추가 설명회 긴급 편성(전타임 마감) (2026-11-03T09:22:00.000Z)
요약
  찾은 글: 2  새로 저장: 0  갱신: 0  본문 이미지: 0
```

`2026-10-29T04:54Z` = 2026-10-29 13:54 KST — 쪽에 적힌 값과 맞는다.

### 스테이징에 실제로 넣은 결과 (그대로)

```
  wr_id=1: 추가 — 문해와 사유 개원 기념 학부모 설명회 안내
  wr_id=2: 추가 — 추가 설명회 긴급 편성(전타임 마감)
요약
  찾은 글: 2  새로 저장: 2  갱신: 0  본문 이미지: 0
```

---

## 3. 이 기록으로 증명되지 않는 것

- **글 2개만 봤다.** 레거시 공지는 현재 2건이고 둘 다 같은 스킨이지만, 과거 글이 복구되거나
  스킨이 바뀌면 선택자가 다시 어긋날 수 있다. 가져오기는 그때 제목·본문을 못 찾으면
  **글 번호만 보고하고 건너뛴다**(저장하지 않는다).
- **첨부 이미지는 가져오지 않는다.** 글 상단 포스터(1-4)는 새 사이트 공지 본문에 들어가지
  않는다. 옛 사이트를 닫으면 그 이미지 주소도 죽는다. → 사람이 판단할 일로 남긴다
  (제안: 직원이 포스터를 「이미지 관리」로 올리고 공지 본문에 넣는다).
- 개인정보로 보이는 글을 건너뛰는 판정(ASM-090)은 이번 2건에서 **한 번도 발동하지 않았다.**
  그 경로는 여전히 실행으로 확인되지 않았다.
