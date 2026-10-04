import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { StudyProvider } from '../../context/StudyContext';

/** Only logged-in users get through; everyone else is sent to /login (and returned afterwards). */
export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  // Keyed by user id so one account's study data can never bleed into another's.
  return (
    <StudyProvider key={user.id}>
      <Outlet />
    </StudyProvider>
  );
}

/** Login / signup are for logged-out users; logged-in users go straight to the dashboard. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
