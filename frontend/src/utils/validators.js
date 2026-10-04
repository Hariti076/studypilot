const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function checkEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return '';
}

/** Returns an object of field -> message. Empty object means valid. */
export function validateLogin({ email, password }) {
  const errors = {};
  const e = checkEmail(email);
  if (e) errors.email = e;
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateSignup({ name, email, password, confirm }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required';
  else if (name.trim().length < 2) errors.name = 'Name is too short';

  const e = checkEmail(email);
  if (e) errors.email = e;

  if (!password) errors.password = 'Password is required';
  else if (password.length < 8) errors.password = 'Use at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Include at least one letter and one number';

  if (!confirm) errors.confirm = 'Please confirm your password';
  else if (confirm !== password) errors.confirm = 'Passwords do not match';
  return errors;
}
