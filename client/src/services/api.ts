import axios from 'axios';

/**
 * Axios instance configured for the backend API.
 *
 * LOCAL DEV:  baseURL = '/api'  — Vite proxy forwards to http://localhost:4000
 * PRODUCTION: baseURL = VITE_API_URL + '/api'  — points directly at the Render backend
 *
 * Authentication uses TWO parallel mechanisms so it works in all environments:
 *  1. HttpOnly cookie (set by backend on login) — works in same-origin & some cross-origin
 *  2. Authorization: Bearer header from sessionStorage — works in ALL cross-origin environments
 *
 * The backend `authenticate` middleware accepts either one.
 * sessionStorage is cleared automatically when the browser tab closes — it is
 * NOT accessible to other tabs or origins, making it safe for JWT storage.
 */
const baseURL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const api = axios.create({
    baseURL,
    withCredentials: true,          // send HttpOnly cookie when available
    headers: { 'Content-Type': 'application/json' },
});

// ── Session-scoped token store ────────────────────────────────────────────────
const TOKEN_KEY = 'jh_token';

export function setAuthToken(token: string | null): void {
    if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
    } else {
        sessionStorage.removeItem(TOKEN_KEY);
    }
}

export function getAuthToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

// ── Request interceptor — attach token as Authorization header ────────────────
api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// ── Response interceptor — extract user-friendly error message ────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.message ??
            "We couldn't complete that request. Please check your connection and try again.";
        return Promise.reject(new Error(message));
    },
);

export default api;
