import type { NotifyAdapter, NotifyMessage } from "@/server/adapters/notify/types";

export class ConsoleNotifyAdapter implements NotifyAdapter {
  readonly name = "console" as const;

  async send(message: NotifyMessage): Promise<void> {
    console.info("notify:console", message);
  }
}
