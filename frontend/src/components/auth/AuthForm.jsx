import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { validateLogin, validateSignup } from '../../utils/validators';

function TextField({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

/** Login / signup form. `mode` is "login" or "signup". */
export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = isSignup ? validateSignup(values) : validateLogin(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setLoading(true);
    try {
      const user = isSignup
        ? await signup({ name: values.name, email: values.email, password: values.password })
        : await login({ email: values.email, password: values.password });
      toast.success(isSignup ? `Welcome to StudyPilot, ${user.name.split(' ')[0]}!` : `Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const cls = (err) => `input ${err ? 'input-error' : ''}`;
  const aria = (id, err) => ({ 'aria-invalid': !!err, 'aria-describedby': err ? `${id}-error` : undefined });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {isSignup && (
        <TextField id="name" label="Full name" error={errors.name}>
          <input id="name" type="text" autoComplete="name" placeholder="Your name" className={cls(errors.name)} value={values.name} onChange={set('name')} {...aria('name', errors.name)} />
        </TextField>
      )}

      <TextField id="email" label="Email" error={errors.email}>
        <input id="email" type="email" autoComplete="email" placeholder="you@example.com" className={cls(errors.email)} value={values.email} onChange={set('email')} {...aria('email', errors.email)} />
      </TextField>

      <TextField id="password" label="Password" error={errors.password}>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
            className={`${cls(errors.password)} !pr-11`}
            value={values.password}
            onChange={set('password')}
            {...aria('password', errors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </TextField>

      {isSignup && (
        <TextField id="confirm" label="Confirm password" error={errors.confirm}>
          <input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat your password" className={cls(errors.confirm)} value={values.confirm} onChange={set('confirm')} {...aria('confirm', errors.confirm)} />
        </TextField>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {isSignup ? 'Creating account…' : 'Signing in…'}
          </>
        ) : isSignup ? (
          'Create account'
        ) : (
          'Log in'
        )}
      </button>
    </form>
  );
}
