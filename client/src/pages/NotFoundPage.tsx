import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="text-center space-y-6">
                <p className="text-8xl font-bold font-mono text-gray-800">404</p>
                <div>
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">Page not found</h1>
                    <p className="text-gray-500">The page you're looking for doesn't exist.</p>
                </div>
                <Link to="/dashboard">
                    <Button variant="primary">Go to dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
