import type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";

/**
 * 실제 공급사 어댑터. `MAIL_ADAPTER=resend`일 때만 선택된다.
 * 테스트에서는 절대 실행하지 않는다. (CLAUDE.md 3장, D4)
 */
export class ResendMailAdapter implements MailAdapter {
  readonly name = "resend" as const;

  async send(message: MailMessage): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("MAIL_ADAPTER_NOT_CONFIGURED");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      // 응답 본문에는 수신자 주소가 들어 있을 수 있어 상태 코드만 남긴다.
      throw new Error(`MAIL_SEND_FAILED_${response.status}`);
    }
  }
}
