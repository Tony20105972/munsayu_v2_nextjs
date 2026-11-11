import type { NotifyAdapter, NotifyMessage } from "@/server/adapters/notify/types";

export class MemoryNotifyAdapter implements NotifyAdapter {
  readonly name = "memory" as const;
  private readonly messages: NotifyMessage[] = [];
  private failNext = false;

  async send(message: NotifyMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("NOTIFY_SEND_FAILED");
    }
    this.messages.push(message);
  }

  /** 발송 실패가 신청 저장을 되돌리지 않는지 확인하는 테스트용 스위치. (BLUEPRINT 5장) */
  failOnce(): void {
    this.failNext = true;
  }

  sent(): readonly NotifyMessage[] {
    return this.messages;
  }

  clear(): void {
    this.messages.length = 0;
    this.failNext = false;
  }
}
