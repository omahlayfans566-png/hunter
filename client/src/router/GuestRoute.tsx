import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/ui/LoadingScreen';

/**
 * Wraps routes that should only be accessible when NOT authenticated
 * (e.g. Login, Register). Redirects to /dashboard if already logged in.
 */
export default function GuestRoute() {
    const { status } = useAuth();

    if (status === 'loading') return <LoadingScreen />;
    if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

    return <Outlet />;
}
