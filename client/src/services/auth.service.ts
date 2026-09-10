import api, { setAuthToken } from './api';
import { User } from '../types';

export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export const authService = {
    async register(data: RegisterData): Promise<User> {
        const res = await api.post('/auth/register', data);
        // Store token in memory so the Authorization header is sent on all
        // subsequent requests — needed for cross-origin production deployments
        // where SameSite=None cookies are not reliably forwarded.
        const token: string | undefined = res.data.data.token;
        if (token) setAuthToken(token);
        return res.data.data.user as User;
    },

    async login(data: LoginData): Promise<User> {
        const res = await api.post('/auth/login', data);
        const token: string | undefined = res.data.data.token;
        if (token) setAuthToken(token);
        return res.data.data.user as User;
    },

    async logout(): Promise<void> {
        await api.post('/auth/logout');
        // Clear in-memory token on logout
        setAuthToken(null);
    },

    async getMe(): Promise<User> {
        // getMe is called on every page load to restore session from the HttpOnly
        // cookie. If the cookie works (same-origin or SameSite=None accepted),
        // this succeeds and the user is restored. The token is NOT available here
        // (it's HttpOnly, we can't read it from JS), so cross-origin refreshes
        // rely on the cookie alone for session restore on page reload.
        const res = await api.get('/auth/me');
        return res.data.data.user as User;
    },
};
