import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/ui/LoadingScreen';

/**
 * Wraps routes that require the user to be authenticated.
 * Shows a loading screen while auth state is being determined.
 * Redirects to /login if the user is unauthenticated.
 */
export default function ProtectedRoute() {
    const { status } = useAuth();

    if (status === 'loading') return <LoadingScreen />;
    if (status === 'unauthenticated') return <Navigate to="/login" replace />;

    return <Outlet />;
}
