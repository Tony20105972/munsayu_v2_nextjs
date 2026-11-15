/**
 * 첫 관리자 계정 한 개를 만든다. (AD-001, D5 · Phase 7)
 *
 * 관리자 추가는 이미 로그인한 관리자만 할 수 있어서(`/admin/members`), 새로 세운
 * 데이터베이스에는 맨 처음 한 명을 이 스크립트로 넣는다. 두 번째부터는 화면에서 한다.
 *
 * 쓰는 법 — 값은 **환경 변수로만** 넘긴다. 명령 줄에 비밀번호를 적으면 셸 기록에 남는다.
 *
 *   BOOTSTRAP_ADMIN_ID=<아이디> BOOTSTRAP_ADMIN_EMAIL=<메일> \
 *     npx tsx --conditions=react-server scripts/bootstrap-admin.ts
 *
 * `BOOTSTRAP_ADMIN_PASSWORD` 를 주지 않으면 임시 비밀번호를 만들어 **터미널에 한 번만**
 * 찍는다. 그 값은 파일·로그·기록에 남지 않으므로 바로 옮겨 적고, 로그인한 뒤 바꾼다.
 */
// 스테이징·운영에서는 `vercel env pull` 로 받은 **별도 파일**을 가리켜 돌린다
// (`docs/migration-checklist.md` 1-9). 그 파일을 읽으려면 dotenv 가 필요하다.
//   DOTENV_CONFIG_PATH=.env.staging BOOTSTRAP_ADMIN_ID=... npm run bootstrap:admin
// 로컬에서는 `.env` 를 읽는다. 이미 process.env 에 있는 값은 덮어쓰지 않는다.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";

function required(name: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`환경 변수 ${name} 을 먼저 넣어 주세요.`);
  }
  return raw;
}

/**
 * 사람이 받아 적을 임시 비밀번호. 헷갈리는 글자(0·O·1·l·I)를 뺀다.
 * 24자면 받아 적기 번거롭지 않으면서 추측으로는 뚫리지 않는다.
 *
 * `byte % alphabet.length` 로 고르면 앞쪽 글자가 조금 더 자주 나온다(256 이 56 의 배수가
 * 아니다). 임시 비밀번호라 실질 위험은 작지만, 치우치지 않게 뽑는 비용도 작으므로
 * 남는 범위에 걸린 바이트는 버리고 다시 뽑는다.
 */
function temporaryPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  const out: string[] = [];

  while (out.length < 24) {
    for (const byte of randomBytes(32)) {
      if (byte >= limit) continue;
      out.push(alphabet[byte % alphabet.length]);
      if (out.length === 24) break;
    }
  }

  return out.join("");
}

async function main(): Promise<void> {
  const loginId = required("BOOTSTRAP_ADMIN_ID");
  const email = required("BOOTSTRAP_ADMIN_EMAIL");
  const givenPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  const password =
    givenPassword && givenPassword.length > 0 ? givenPassword : temporaryPassword();

  const existing = await db.user.findUnique({ where: { loginId } });
  if (existing) {
    // 덮어쓰지 않는다. 이미 쓰고 있는 계정의 비밀번호를 말없이 바꾸면 안 된다.
    throw new Error(
      `아이디 ${loginId} 는 이미 있습니다. 다른 아이디를 쓰거나 화면에서 관리해 주세요.`,
    );
  }

  await db.user.create({
    data: {
      loginId,
      passwordHash: await hashPassword(password),
      name: "관리자",
      email,
      phone: "010-0000-0000",
      role: "ADMIN",
    },
  });

  console.log(`관리자 계정을 만들었습니다: ${loginId}`);
  if (!givenPassword) {
    console.log("");
    console.log(
      "아래 임시 비밀번호는 지금 한 번만 보입니다. 옮겨 적고 로그인한 뒤 바꿔 주세요.",
    );
    console.log(`  임시 비밀번호: ${password}`);
    console.log("");
  }
}

main()
  .catch((error: unknown) => {
    // 메시지만 남긴다. 스택에 값이 섞여 나오지 않게 한다.
    console.error(
      error instanceof Error ? error.message : "관리자 계정을 만들지 못했습니다.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
