import "server-only";
export interface MailAdapter { send(message: { to: string; subject: string; text: string }): Promise<void> }
class ConsoleMailAdapter implements MailAdapter { async send(message: { to: string; subject: string; text: string }) { console.info("mail queued", { subject: message.subject }); } }
class ResendMailAdapter implements MailAdapter { async send(message: { to: string; subject: string; text: string }) { const key = process.env.RESEND_API_KEY; const from = process.env.MAIL_FROM; if (!key || !from) throw new Error("MAIL_NOT_CONFIGURED"); await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, ...message }) }); } }
export const mail: MailAdapter = process.env.MAIL_ADAPTER === "resend" ? new ResendMailAdapter() : new ConsoleMailAdapter();
