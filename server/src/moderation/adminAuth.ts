export function isAdminEmail(email: string, adminEmails: string[]): boolean {
  return adminEmails.includes(email.trim().toLowerCase())
}
