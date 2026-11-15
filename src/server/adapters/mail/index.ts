import "server-only";
import { ConsoleMailAdapter } from "@/server/adapters/mail/console-adapter";
import { FileMailAdapter } from "@/server/adapters/mail/file-adapter";
import { MemoryMailAdapter } from "@/server/adapters/mail/memory-adapter";
import { ResendMailAdapter } from "@/server/adapters/mail/resend-adapter";
import type { MailAdapter } from "@/server/adapters/mail/types";
import { envValue } from "@/server/env";

export type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";
export { MemoryMailAdapter } from "@/server/adapters/mail/memory-adapter";

const adapters = {
  console: new ConsoleMailAdapter(),
  file: new FileMailAdapter(),
  memory: new MemoryMailAdapter(),
  resend: new ResendMailAdapter(),
} as const;

/** 환경 변수로 어댑터를 고른다. 기본은 실제 발송이 없는 console이다. (ASM-010) */
export function getMailAdapter(): MailAdapter {
  const selected = envValue("MAIL_ADAPTER");
  if (selected === "resend") return adapters.resend;
  if (selected === "memory") return adapters.memory;
  // E2E 전용. 메일 본문을 파일로 떨어뜨려 별도 프로세스인 테스트가 읽을 수 있게 한다.
  if (selected === "file") return adapters.file;
  return adapters.console;
}

/** 테스트에서 보낸 메일을 확인하려면 이 인스턴스를 쓴다. */
export function getMemoryMailAdapter(): MemoryMailAdapter {
  return adapters.memory;
}
