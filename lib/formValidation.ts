export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
export function contactFieldErrors(name: string, email: string, message: string) {
  const errors: Partial<Record<'name' | 'email' | 'message', string>> = {}
  if (!name.trim()) errors.name = 'Please enter your name.'
  else if (name.trim().length > 100) errors.name = 'Keep your name under 101 characters.'
  if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.'
  if (message.trim().length < 10) errors.message = 'Please enter a message of at least 10 characters.'
  else if (message.trim().length > 5000) errors.message = 'Keep your message under 5,001 characters.'
  return errors
}
