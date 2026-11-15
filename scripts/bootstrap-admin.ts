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
import type { ZodType } from "zod";
import { emailSchema, loginIdSchema, passwordSchema } from "../src/lib/contracts/auth";
import { db } from "../src/server/db";
import { generateTemporaryPassword, hashPassword } from "../src/server/auth/password";

function required(name: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`환경 변수 ${name} 을 먼저 넣어 주세요.`);
  }
  return raw;
}

/**
 * **로그인 화면과 같은 계약으로 검사한다.**
 *
 * 전에는 검사가 없었다. 그래서 `staging-admin` 처럼 하이픈이 든 아이디로 계정이
 * 만들어졌고, 로그인 화면은 `loginIdSchema`(영문 소문자·숫자·밑줄)로 그 아이디를
 * **거부했다.** 아무도 들어갈 수 없는 관리자가 생기고, 이 스크립트는 같은 아이디를
 * 덮어쓰지 않으므로 고칠 길도 없었다 (OBSERVED 2026-11-15, EV-0019).
 *
 * 전환 때 운영 첫 관리자를 만드는 **유일한 경로**라서, 값이 틀리면 만들기 전에 멈춘다.
 */
function checked<T>(schema: ZodType<T>, value: unknown, name: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    // 값은 메시지에 넣지 않는다. 규칙만 알려 준다. (CLAUDE.md 4장)
    const reason = result.error.issues.map((issue) => issue.message).join(" / ");
    throw new Error(`${name} 이 로그인 규칙에 맞지 않습니다: ${reason}`);
  }
  return result.data;
}

async function main(): Promise<void> {
  const loginId = checked(
    loginIdSchema,
    required("BOOTSTRAP_ADMIN_ID"),
    "BOOTSTRAP_ADMIN_ID",
  );
  const email = checked(
    emailSchema,
    required("BOOTSTRAP_ADMIN_EMAIL"),
    "BOOTSTRAP_ADMIN_EMAIL",
  );
  const givenPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  const password =
    givenPassword && givenPassword.length > 0
      ? checked(passwordSchema, givenPassword, "BOOTSTRAP_ADMIN_PASSWORD")
      : generateTemporaryPassword();

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
      /*
       * AD-016 첫 로그인 때 비밀번호를 바꾸게 한다.
       *
       * 이 비밀번호는 터미널에 찍혀 사람 손을 거쳐 전달된다(또는 명령 줄에 적힌다).
       * 그 경로에 남은 값이 계정의 영구 비밀번호가 되면 안 된다. 깃발이 켜져 있으면
       * 관리자 화면이 비밀번호 변경 외의 어떤 일도 받지 않는다.
       */
      mustChangePassword: true,
    },
  });

  console.log(`관리자 계정을 만들었습니다: ${loginId}`);
  console.log("첫 로그인 때 비밀번호를 바꿔야 합니다. 바꾸기 전에는 다른 화면을 쓸 수 없습니다.");
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
