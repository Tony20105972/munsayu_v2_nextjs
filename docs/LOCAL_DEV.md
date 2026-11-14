# 내 컴퓨터에서 새 사이트 띄워 보기

> 이 문서는 **개발을 모르는 분도 순서대로 따라 하면 되도록** 썼습니다.
> 여기 적힌 명령은 모두 저장소 맨 위 폴더(`munsayu_v2_nextjs`)에서 실행합니다.
> 실제 비밀번호·열쇠 값은 이 문서에 적지 않습니다. **키 이름만** 적습니다. (CLAUDE.md 7장)

---

## 0. 미리 준비할 것

| 프로그램                           | 왜 필요한가                                        | 확인 명령                         |
| ---------------------------------- | -------------------------------------------------- | --------------------------------- |
| Node.js 22 이상                    | 사이트를 돌리는 프로그램                           | `node -v`                         |
| npm                                | 필요한 꾸러미를 받는 도구 (Node 에 같이 들어 있음) | `npm -v`                          |
| PostgreSQL 16 이상 **또는** Docker | 자료를 담는 곳                                     | `psql --version` 또는 `docker -v` |

---

## 1. 꾸러미 받기

```bash
npm install
```

`postinstall` 이 자동으로 `prisma generate` 를 돌려 DB 접근 코드를 만듭니다.

---

## 2. 자료 보관소(DB) 띄우기

둘 중 **하나만** 고르면 됩니다.

### 방법 A — Docker (권장)

```bash
docker run --name munsayu-db \
  -e POSTGRES_PASSWORD=<직접 정한 비밀번호> \
  -e POSTGRES_DB=munsayu_dev \
  -p 55433:5432 \
  -d postgres:16
```

- 이미 만들어 둔 뒤 껐다면 `docker start munsayu-db` 로 다시 켭니다.
- 끌 때는 `docker stop munsayu-db`.

### 방법 B — 저장소에 들어 있는 로컬 Postgres 쓰기

```bash
npm run db:start   # .tmp/pgdata 를 55433 번 문으로 띄움
npm run db:stop    # 끌 때
```

---

## 3. `.env` 만들기

`.env.example` 을 복사해서 `.env` 를 만들고, 값만 채웁니다.

```bash
cp .env.example .env
```

채워야 하는 **키 이름**은 다음과 같습니다. (값은 각자 환경에 맞게 적습니다)

| 키 이름                                        | 무엇인가                                             | 비어 있어도 되나                            |
| ---------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                                 | 개발용 DB 접속 주소                                  | 아니오 (반드시 필요)                        |
| `DATABASE_URL_TEST`                            | 테스트 전용 DB 접속 주소                             | 테스트를 돌리려면 필요                      |
| `AUTH_SECRET`                                  | 로그인 유지·토큰 서명에 쓰는 비밀값                  | 아니오                                      |
| `APP_BASE_URL`                                 | 메일 안 링크의 기준 주소                             | 비밀번호 재설정을 쓰려면 필요               |
| `MAIL_ADAPTER`                                 | 메일 보내는 방식 (`console` 이면 실제로 보내지 않음) | 비우면 `console`                            |
| `MAIL_FROM`                                    | 메일 발신 주소                                       | 메일을 보낼 때만                            |
| `RESEND_API_KEY`                               | 실제 메일 발송 업체 열쇠                             | 개발에서는 비워 둡니다                      |
| `NOTIFY_ADAPTER`                               | 직원 알림 방식 (현재 `console` 만)                   | 비워도 됩니다                               |
| `ANALYTICS_PROVIDER_ID`                        | 방문 통계 ID                                         | 비워 두면 통계 스크립트가 들어가지 않습니다 |
| `STORAGE_ROOT`                                 | 올린 파일을 둘 폴더                                  | 비우면 `.storage` 를 씁니다                 |
| `PRIVACY_PURGE_SECRET`                         | 보존 기간 지난 기록 파기 예약 실행을 보호하는 비밀값 | 예약 실행을 쓸 때만                         |
| `SEED_ADMIN_PASSWORD` / `SEED_MEMBER_PASSWORD` | 연습용 가짜 계정 비밀번호                            | 시드를 쓸 때만                              |

> `DATABASE_URL` 예시 형태: `postgresql://<사용자>:<비밀번호>@127.0.0.1:55433/munsayu_dev`
> **진짜 값은 `.env` 에만 두고, 어디에도 올리지 않습니다.**

### 올린 파일은 어디에 쌓이나

- `STORAGE_ROOT/private/` — **강사 지원 이력서**가 여기 쌓입니다. 공개 주소가 없고
  관리자 인증 경로로만 내려받습니다. (AD-011)
- `STORAGE_ROOT/public/` — 공지 본문 이미지와 공지 첨부파일이 쌓입니다.

이 폴더는 저장소에 올리지 않습니다.

---

## 4. 표 만들기 (마이그레이션)

```bash
npm run db:deploy
```

처음부터 다시 만들고 싶으면:

```bash
npm run db:reset    # 모든 자료를 지우고 표를 새로 만든 뒤 시드까지 넣습니다
```

---

## 5. 연습용 자료 넣기 (시드)

```bash
npm run db:seed
```

- 넣는 자료는 **전부 가짜**입니다. 실제 학생·학부모 정보는 쓰지 않습니다. (CLAUDE.md 3장)
- 여러 번 실행해도 같은 결과가 됩니다.
- 실행하면 화면에 **연습용 관리자 아이디와 비밀번호**가 찍힙니다. 그 값을 그대로 씁니다.
  (이 문서에는 적지 않습니다)

---

## 6. 사이트 켜기

```bash
npm run dev
```

브라우저에서 아래 주소로 들어갑니다.

| 무엇                             | 주소                              |
| -------------------------------- | --------------------------------- |
| 공개 사이트 (홈)                 | http://localhost:3000             |
| 회원 로그인                      | http://localhost:3000/login       |
| 회원 가입                        | http://localhost:3000/register    |
| **관리자 로그인**                | http://localhost:3000/admin/login |
| 관리자 첫 화면                   | http://localhost:3000/admin       |
| 강사 지원 (메뉴에는 숨겨져 있음) | http://localhost:3000/sub/Recruit |

> 관리자 주소는 레거시의 `/uAdmin/` 이 아니라 **`/admin`** 입니다.
> 레거시 관리자 주소로 들어오면 410(없어진 주소)으로 답하고, 새 주소를 알려 주지 않습니다. (RT-004)

---

## 7. 첫 관리자 계정 만드는 방법

### 7-1. 연습(개발)할 때

`npm run db:seed` 가 연습용 관리자 계정을 만들어 주고, 실행할 때 화면에
아이디와 비밀번호를 찍어 줍니다. 그 값으로 `/admin/login` 에 들어갑니다.

### 7-2. 시드를 쓰지 않고 직접 만들 때

관리자 계정 추가는 **이미 로그인한 관리자만** 할 수 있습니다(`/admin/members` 화면).
그래서 맨 처음 한 명은 아래처럼 만듭니다.

```bash
npx tsx --conditions=react-server -e "
import { db } from './src/server/db';
import { hashPassword } from './src/server/auth/password';

const loginId = process.env.BOOTSTRAP_ADMIN_ID;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
if (!loginId || !password || !email) throw new Error('환경변수를 먼저 넣어 주세요');

await db.user.create({
  data: {
    loginId,
    passwordHash: await hashPassword(password),
    name: '관리자',
    email,
    phone: '010-0000-0000',
    role: 'ADMIN',
  },
});
console.log('관리자 계정을 만들었습니다:', loginId);
await db.\$disconnect();
"
```

실행 전에 값을 **환경 변수로만** 넘깁니다. 명령 줄에 비밀번호를 직접 적지 않습니다.

```bash
BOOTSTRAP_ADMIN_ID=<아이디> BOOTSTRAP_ADMIN_PASSWORD=<비밀번호> BOOTSTRAP_ADMIN_EMAIL=<메일> npx tsx ...
```

> 두 번째 관리자부터는 `/admin/members` 화면에서 추가·삭제합니다. (AD-001, D5)

---

## 8. 확인·검사 명령

| 하고 싶은 일          | 명령                       |
| --------------------- | -------------------------- |
| 타입 검사             | `npm run typecheck`        |
| 문법 검사             | `npm run lint`             |
| 코드 모양 검사        | `npm run format`           |
| 단위 테스트           | `npm run test:unit`        |
| 통합 테스트 (DB 필요) | `npm run test:integration` |
| 전체 테스트           | `npm test`                 |
| 화면 동작 테스트(E2E) | `npm run e2e`              |
| 화면 모양 비교        | `npm run e2e:visual`       |

---

## 9. 레거시 공지 가져오기 (AD-014)

레거시 공개 공지 화면을 **읽기만** 해서 새 DB 로 옮깁니다.

```bash
npm run import:notices -- --dry-run   # 받아만 보고 저장하지 않음 (먼저 이걸로 확인)
npm run import:notices                # 실제 저장
```

- GET 요청만 보내고, 요청 사이에 1초 이상 쉽니다. 운영 사이트에 쓰기 요청을 보내지 않습니다.
- 여러 번 실행해도 글이 중복되지 않습니다. 레거시 글 번호(`wr_id`)로 같은 글을 알아봅니다.
- 개인정보가 보이는 글은 **가져오지 않고** 글 번호만 알려 줍니다. 사람이 보고 판단합니다.
- **로컬 DB 에서만 실행합니다.** 운영 DB 실행은 Phase 7 체크리스트에서 따로 다룹니다.

---

## 10. 자주 막히는 곳

| 증상                          | 해결                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| `Can't reach database server` | DB 가 꺼져 있습니다. 2번으로 돌아가 켭니다.                      |
| `relation ... does not exist` | 표가 없습니다. `npm run db:deploy` 를 실행합니다.                |
| 관리자 화면이 로그인으로 튕김 | 세션이 끊긴 것입니다. `/admin/login` 에서 다시 들어갑니다.       |
| 이력서 내려받기가 404         | 파일이 지워졌거나 보존 기간이 지나 파기된 건입니다. (AD-013)     |
| 공지 본문의 서식이 사라짐     | 서버가 허용하지 않는 태그를 지웁니다. 정상 동작입니다. (ADR-006) |
| 「N분 뒤 다시 시도해 주세요」 로 로그인이 막힘 | 비밀번호를 여러 번 틀려 잠긴 것입니다. 안내한 시간만큼 기다리거나, 로컬에서는 `npm run db:unlock` 으로 바로 풉니다. 아이디 하나만 풀려면 `npm run db:unlock -- admin`. **운영에서는 돌지 않습니다.** |
| 시드 비밀번호로 로그인이 안 됨 | `.env` 에 `SEED_ADMIN_PASSWORD` 를 넣었다면 그 값이 관리자 비밀번호입니다. 넣지 않았다면 `npm run db:seed` 가 마지막에 찍어 주는 값을 씁니다. **키만 있고 값이 비어 있으면 없는 것으로 봅니다.** |
