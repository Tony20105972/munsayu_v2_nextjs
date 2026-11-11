import "server-only";
import { ConsoleMailAdapter } from "@/server/adapters/mail/console-adapter";
import { MemoryMailAdapter } from "@/server/adapters/mail/memory-adapter";
import { ResendMailAdapter } from "@/server/adapters/mail/resend-adapter";
import type { MailAdapter } from "@/server/adapters/mail/types";

export type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";
export { MemoryMailAdapter } from "@/server/adapters/mail/memory-adapter";

const adapters = {
  console: new ConsoleMailAdapter(),
  memory: new MemoryMailAdapter(),
  resend: new ResendMailAdapter(),
} as const;

/** 환경 변수로 어댑터를 고른다. 기본은 실제 발송이 없는 console이다. (ASM-010) */
export function getMailAdapter(): MailAdapter {
  const selected = process.env.MAIL_ADAPTER;
  if (selected === "resend") return adapters.resend;
  if (selected === "memory") return adapters.memory;
  return adapters.console;
}

/** 테스트에서 보낸 메일을 확인하려면 이 인스턴스를 쓴다. */
export function getMemoryMailAdapter(): MemoryMailAdapter {
  return adapters.memory;
}
