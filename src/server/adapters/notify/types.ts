export type NotifyMessage = {
  /** 직원 알림 채널 식별자. 개인 연락처를 넣지 않는다. */
  channel: string;
  /** 개인정보를 담지 않는 안내 문구. */
  text: string;
};

/**
 * 문자 발송 자리. D4에서 문자 발송은 하지 않기로 했으므로 공급사 구현은 없고
 * console/memory 어댑터만 둔다.
 */
export interface NotifyAdapter {
  readonly name: "console" | "memory";
  send(message: NotifyMessage): Promise<void>;
}
