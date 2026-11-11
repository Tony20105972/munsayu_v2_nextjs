export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/** 메일 발송은 이 인터페이스 뒤에만 둔다. 개발·테스트에서는 실제로 보내지 않는다. (D4, ASM-010) */
export interface MailAdapter {
  readonly name: "console" | "memory" | "resend";
  send(message: MailMessage): Promise<void>;
}
