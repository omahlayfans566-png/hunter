import api from './api';
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
        return res.data.data.user as User;
    },

    async login(data: LoginData): Promise<User> {
        const res = await api.post('/auth/login', data);
        return res.data.data.user as User;
    },

    async logout(): Promise<void> {
        await api.post('/auth/logout');
    },

    async getMe(): Promise<User> {
        const res = await api.get('/auth/me');
        return res.data.data.user as User;
    },
};
