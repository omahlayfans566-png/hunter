import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AlertBanner from '../components/ui/AlertBanner';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

    function validate() {
        const e: typeof errors = {};
        if (!email.trim()) e.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email.';
        if (!password) e.password = 'Password is required.';
        return e;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setApiError('');
        try {
            await login({ email, password });
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">Welcome back</h1>
                <p className="text-gray-400 text-sm">Log in to your job discovery workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {apiError && <AlertBanner type="error" message={apiError} />}

                <Input
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}); setApiError(''); }}
                    error={errors.email}
                    disabled={loading}
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({}); setApiError(''); }}
                    error={errors.password}
                    disabled={loading}
                />

                <Button type="submit" fullWidth size="lg" isLoading={loading}>
                    {loading ? 'Logging in…' : 'Log in'}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                    Create one
                </Link>
            </p>
        </div>
    );
}
