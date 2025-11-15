export interface ValidationError {
  field: string
  message: string
}

export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    return { field: "email", message: "Email is required" }
  }
  if (!emailRegex.test(email)) {
    return { field: "email", message: "Please enter a valid email address" }
  }
  return null
}

export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: "password", message: "Password is required" }
  }
  if (password.length < 8) {
    return { field: "password", message: "Password must be at least 8 characters" }
  }
  if (!/[A-Z]/.test(password)) {
    return { field: "password", message: "Password must contain at least one uppercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { field: "password", message: "Password must contain at least one number" }
  }
  return null
}

export function validateFullName(name: string): ValidationError | null {
  if (!name) {
    return { field: "fullName", message: "Full name is required" }
  }
  if (name.length < 2) {
    return { field: "fullName", message: "Full name must be at least 2 characters" }
  }
  return null
}

export function validateSignUp(email: string, password: string, fullName: string): ValidationError[] {
  const errors: ValidationError[] = []

  const emailError = validateEmail(email)
  if (emailError) errors.push(emailError)

  const passwordError = validatePassword(password)
  if (passwordError) errors.push(passwordError)

  const nameError = validateFullName(fullName)
  if (nameError) errors.push(nameError)

  return errors
}
