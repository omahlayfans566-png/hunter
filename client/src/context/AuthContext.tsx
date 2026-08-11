import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { User, AuthStatus } from '../types';
import { authService, LoginData, RegisterData } from '../services/auth.service';

// ── State & Actions ───────────────────────────────────────────────────────────

interface AuthState {
    status: AuthStatus;
    user: User | null;
}

type AuthAction =
    | { type: 'SET_LOADING' }
    | { type: 'SET_USER'; payload: User }
    | { type: 'CLEAR_USER' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, status: 'loading' };
        case 'SET_USER':
            return { status: 'authenticated', user: action.payload };
        case 'CLEAR_USER':
            return { status: 'unauthenticated', user: null };
        default:
            return state;
    }
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, {
        status: 'loading',
        user: null,
    });

    // On mount: try to restore session from the HttpOnly cookie
    useEffect(() => {
        authService
            .getMe()
            .then((user) => dispatch({ type: 'SET_USER', payload: user }))
            .catch(() => dispatch({ type: 'CLEAR_USER' }));
    }, []);

    const login = useCallback(async (data: LoginData) => {
        const user = await authService.login(data);
        dispatch({ type: 'SET_USER', payload: user });
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        const user = await authService.register(data);
        dispatch({ type: 'SET_USER', payload: user });
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        dispatch({ type: 'CLEAR_USER' });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
