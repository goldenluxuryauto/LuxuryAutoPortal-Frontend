/**
 * Password strength checking utility
 */

export interface PasswordStrength {
  score: number; // 0-4 (0=weak, 4=very strong)
  feedback: string[];
  isValid: boolean; // true if meets minimum requirements
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long");
    return { score: 0, feedback, isValid: false };
  }

  score += 1; // Base score for meeting minimum length

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add uppercase letters");
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add lowercase letters");
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add numbers");
  }

  // Check for special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Add special characters");
  }

  // Additional checks
  if (password.length >= 12) {
    score = Math.min(score + 0.5, 4); // Bonus for longer passwords
  }

  // Check for common patterns
  const commonPatterns = [
    /12345/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
  ];
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    feedback.push("Avoid common patterns");
  }

  const isValid = score >= 2 && password.length >= 8;

  // Provide positive feedback if password is strong
  if (score >= 3 && feedback.length === 0) {
    feedback.push("Strong password");
  }

  return {
    score: Math.min(Math.floor(score), 4),
    feedback: feedback.length > 0 ? feedback : ["Password meets requirements"],
    isValid,
  };
}

export function getPasswordStrengthColor(score: number): string {
  if (score === 0) return "bg-red-500";
  if (score === 1) return "bg-orange-500";
  if (score === 2) return "bg-yellow-500";
  if (score === 3) return "bg-blue-500";
  return "bg-green-500";
}

export function getPasswordStrengthLabel(score: number): string {
  if (score === 0) return "Very Weak";
  if (score === 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

