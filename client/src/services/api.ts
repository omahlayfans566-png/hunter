import axios from 'axios';

/**
 * Axios instance configured for the backend API.
 *
 * LOCAL DEV:  baseURL = '/api'  — Vite proxy forwards to http://localhost:4000
 * PRODUCTION: baseURL = VITE_API_URL + '/api'  — points directly at the Render backend
 *
 * Set VITE_API_URL in Render's environment variables for the Static Site, e.g.:
 *   VITE_API_URL=https://your-backend.onrender.com
 */
const baseURL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — extract a user-friendly error message
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.message ??
            'We couldn\'t complete that request. Please check your connection and try again.';
        return Promise.reject(new Error(message));
    },
);

export default api;
