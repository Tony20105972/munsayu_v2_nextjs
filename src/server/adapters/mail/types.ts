export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/** 메일 발송은 이 인터페이스 뒤에만 둔다. 개발·테스트에서는 실제로 보내지 않는다. (D4, ASM-010) */
export interface MailAdapter {
  /** `file` 은 E2E 전용이다. 메일 본문을 파일로 남겨 별도 프로세스가 읽을 수 있게 한다. */
  readonly name: "console" | "memory" | "resend" | "file";
  send(message: MailMessage): Promise<void>;
}
