import "server-only";
import { ConsoleNotifyAdapter } from "@/server/adapters/notify/console-adapter";
import { MemoryNotifyAdapter } from "@/server/adapters/notify/memory-adapter";
import type { NotifyAdapter, NotifyMessage } from "@/server/adapters/notify/types";
import { envValue } from "@/server/env";

export type { NotifyAdapter, NotifyMessage } from "@/server/adapters/notify/types";
export { MemoryNotifyAdapter } from "@/server/adapters/notify/memory-adapter";

const adapters = {
  console: new ConsoleNotifyAdapter(),
  memory: new MemoryNotifyAdapter(),
} as const;

export function getNotifyAdapter(): NotifyAdapter {
  return envValue("NOTIFY_ADAPTER") === "memory" ? adapters.memory : adapters.console;
}

export function getMemoryNotifyAdapter(): MemoryNotifyAdapter {
  return adapters.memory;
}

/**
 * 알림 실패는 삼킨다. 저장이 끝난 신청을 알림 때문에 되돌리지 않는다. (BLUEPRINT 5장)
 */
export async function notifyQuietly(message: NotifyMessage): Promise<boolean> {
  try {
    await getNotifyAdapter().send(message);
    return true;
  } catch {
    console.warn("notify_failed", { channel: message.channel });
    return false;
  }
}
