import type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";

/** 받는 주소는 개인정보이므로 로컬 로그에도 가려서 남긴다. */
function maskRecipient(address: string): string {
  const [local, domain] = address.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

/**
 * 기본 어댑터. 실제로 보내지 않고 콘솔에만 남긴다.
 * 운영에서는 본문을 남기지 않는다(토큰·개인정보 포함 가능). 로컬 개발에서만 본문을 보여 준다. // ASM-021
 */
export class ConsoleMailAdapter implements MailAdapter {
  readonly name = "console" as const;

  async send(message: MailMessage): Promise<void> {
    const base = { to: maskRecipient(message.to), subject: message.subject };
    if (process.env.NODE_ENV === "production") {
      console.info("mail:console", base);
      return;
    }
    console.info("mail:console", { ...base, text: message.text });
  }
}
