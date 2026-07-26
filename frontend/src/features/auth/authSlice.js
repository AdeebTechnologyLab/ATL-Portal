import { createSlice } from '@reduxjs/toolkit';

// Try to restore user from localStorage or sessionStorage
const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');

const initialState = {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null,
    isAuthenticated: !!(storedUser && storedToken),
    isLoading: false,
    error: null,
    role: storedUser ? JSON.parse(storedUser).role : null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        loginSuccess: (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.role = action.payload.user.role;

            const { rememberMe } = action.payload;
            const storage = rememberMe ? localStorage : sessionStorage;
            const loginTime = new Date().getTime();

            storage.setItem('token', action.payload.token);
            storage.setItem('user', JSON.stringify(action.payload.user));
            storage.setItem('loginTime', loginTime.toString());
            storage.setItem('rememberMe', rememberMe ? 'true' : 'false');

            // Clear other storage to avoid conflict
            const otherStorage = rememberMe ? sessionStorage : localStorage;
            otherStorage.removeItem('token');
            otherStorage.removeItem('user');
            otherStorage.removeItem('loginTime');
            otherStorage.removeItem('rememberMe');
        },
        loginFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.role = null;
            state.error = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('rememberMe');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('loginTime');
            sessionStorage.removeItem('rememberMe');
        },
        clearError: (state) => {
            state.error = null;
        },
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.role = action.payload.role;
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(action.payload));
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
            const rememberMe = (localStorage.getItem('rememberMe') || sessionStorage.getItem('rememberMe')) === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(state.user));
        },
    },
});

export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    clearError,
    setUser,
    updateUser,
} = authSlice.actions;

export default authSlice.reducer;

