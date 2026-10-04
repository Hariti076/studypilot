import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <EmptyState icon={Compass} title="Page not found" text="The page you're looking for doesn't exist or has moved.">
        <Link to="/dashboard" className="btn-primary">
          Go to dashboard
        </Link>
      </EmptyState>
    </div>
  );
}
