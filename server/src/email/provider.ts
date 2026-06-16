export type OutgoingEmail = { to: string; subject: string; text: string; html?: string }

export interface EmailProvider {
  sendEmail(email: OutgoingEmail): Promise<void>
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(email: OutgoingEmail): Promise<void> {
    console.log(`[email] to=${email.to} subject=${email.subject}\n${email.text}`)
  }
}

export class FakeEmailProvider implements EmailProvider {
  sent: OutgoingEmail[] = []

  async sendEmail(email: OutgoingEmail): Promise<void> {
    this.sent.push(email)
  }
}
