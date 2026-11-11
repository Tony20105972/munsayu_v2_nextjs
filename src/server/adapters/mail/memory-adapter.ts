import type { MailAdapter, MailMessage } from "@/server/adapters/mail/types";

/** 테스트 전용. 보낸 메시지를 모아 두고 단정에 쓴다. 실제 발송은 하지 않는다. */
export class MemoryMailAdapter implements MailAdapter {
  readonly name = "memory" as const;
  private readonly messages: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }

  sent(): readonly MailMessage[] {
    return this.messages;
  }

  clear(): void {
    this.messages.length = 0;
  }
}
