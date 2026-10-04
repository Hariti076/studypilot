import { Link } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import AuthForm from '../components/auth/AuthForm';

export default function Signup() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Get a personalised study plan in a couple of minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
