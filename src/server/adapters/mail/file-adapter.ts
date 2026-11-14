import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";
import { envValue } from "@/server/env";

/**
 * E2E 전용 어댑터. 실제로 보내지 않고 `MAIL_OUTBOX_FILE` 에 한 줄 JSON으로 덧붙인다.
 *
 * 비밀번호 재설정은 메일 본문의 링크를 눌러야 끝나는 흐름이라, 토큰이 해시로만 저장되는 구조에서는
 * 테스트가 본문을 읽을 방법이 필요하다. 메모리 어댑터는 서버 프로세스 안에만 있어
 * 별도 프로세스인 Playwright 가 읽을 수 없다.
 *
 * 운영에서는 쓰지 않는다. `MAIL_ADAPTER=file` 과 `MAIL_OUTBOX_FILE` 이 함께 있어야 동작한다.
 */
export class FileMailAdapter implements MailAdapter {
  readonly name = "file" as const;

  async send(message: MailMessage): Promise<void> {
    const target = envValue("MAIL_OUTBOX_FILE");
    if (!target) {
      throw new Error("MAIL_OUTBOX_FILE 이 없어 file 메일 어댑터를 쓸 수 없습니다.");
    }
    await mkdir(dirname(target), { recursive: true });
    const record = {
      sentAt: new Date().toISOString(),
      to: message.to,
      subject: message.subject,
      text: message.text,
    };
    await appendFile(target, `${JSON.stringify(record)}\n`, "utf8");
  }
}
