import axios from 'axios';

/**
 * Axios instance configured for the backend API.
 * - withCredentials: true sends the HttpOnly auth cookie automatically.
 * - baseURL: uses the Vite proxy so we never hard-code the backend port.
 */
const api = axios.create({
    baseURL: '/api',
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
