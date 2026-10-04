import { Link } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import AuthForm from '../components/auth/AuthForm';

export default function Login() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to continue your study plan."
      footer={
        <>
          New to StudyPilot?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthCard>
  );
}
