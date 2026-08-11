import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AlertBanner from '../components/ui/AlertBanner';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

function validateForm(data: FormData): FormErrors {
    const errors: FormErrors = {};

    if (!data.firstName.trim()) errors.firstName = 'First name is required.';
    if (!data.lastName.trim()) errors.lastName = 'Last name is required.';

    if (!data.email.trim()) {
        errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Please enter a valid email address.';
    }

    if (!data.password) {
        errors.password = 'Password is required.';
    } else if (data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(data.password)) {
        errors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(data.password)) {
        errors.password = 'Password must contain at least one number.';
    }

    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
}

export default function RegisterPage() {
    const { register } = useAuth();
    const [form, setForm] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        setApiError('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validationErrors = validateForm(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setApiError('');
        try {
            await register(form);
            // AuthContext will update status → GuestRoute redirects to /dashboard
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">Create your account</h1>
                <p className="text-gray-400 text-sm">
                    Start building your personal job discovery workspace.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {apiError && <AlertBanner type="error" message={apiError} />}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First name"
                        name="firstName"
                        autoComplete="given-name"
                        value={form.firstName}
                        onChange={handleChange}
                        error={errors.firstName}
                        disabled={loading}
                    />
                    <Input
                        label="Last name"
                        name="lastName"
                        autoComplete="family-name"
                        value={form.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                        disabled={loading}
                    />
                </div>

                <Input
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    disabled={loading}
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    hint="At least 8 characters, one uppercase letter, one number."
                    disabled={loading}
                />

                <Input
                    label="Confirm password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    disabled={loading}
                />

                <Button type="submit" fullWidth size="lg" isLoading={loading}>
                    {loading ? 'Creating account…' : 'Create account'}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                    Log in
                </Link>
            </p>
        </div>
    );
}
