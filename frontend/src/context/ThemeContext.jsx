import { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { APP_THEMES } from '../constants/themes';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const user = useSelector((state) => state.auth.user);
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });

    const [theme, setTheme] = useState(() => {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const accountTheme = storedUser ? JSON.parse(storedUser)?.preferences?.colorTheme : '';
        return accountTheme || localStorage.getItem('color-theme') || 'orange';
    });

    const [dateFormat, setDateFormat] = useState(() => {
        return localStorage.getItem('date-format') || 'DD MMM YYYY';
    });

    const [timeFormat, setTimeFormat] = useState(() => {
        return localStorage.getItem('time-format') || '12-hour';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        // Remove all color theme classes first
        const themeClasses = APP_THEMES
            .filter(option => option.id !== 'orange')
            .map(option => `theme-${option.id}`);
        document.documentElement.classList.remove(...themeClasses, 'theme-custom');

        const customProperties = [
            '--primary', '--primary-dark', '--primary-darkest', '--primary-light', '--primary-lighter',
            '--secondary', '--secondary-light', '--secondary-dark', '--brand-blue-50', '--brand-blue-100',
            '--brand-blue-200', '--brand-blue-300', '--brand-blue-400', '--brand-blue-500', '--brand-blue-600',
            '--brand-blue-700', '--brand-blue-800', '--brand-blue-900', '--bg-sidebar', '--bg-sidebar-light',
            '--bg-sidebar-dark', '--text-primary', '--text-secondary', '--success', '--accent-teal'
        ];
        customProperties.forEach(property => document.documentElement.style.removeProperty(property));
        
        // Add current theme class if not default (orange)
        if (theme !== 'orange') {
            document.documentElement.classList.add(`theme-${theme}`);
        }

        if (theme === 'custom') {
            const colors = user?.preferences?.customTheme || {
                primary: '#7C3AED', accent: '#06B6D4', sidebar: '#1E1B4B'
            };
            const values = {
                '--primary': colors.primary,
                '--primary-dark': colors.sidebar,
                '--primary-darkest': colors.sidebar,
                '--primary-light': colors.accent,
                '--primary-lighter': `color-mix(in srgb, ${colors.primary} 18%, white)`,
                '--secondary': colors.sidebar,
                '--secondary-light': colors.accent,
                '--secondary-dark': colors.sidebar,
                '--brand-blue-50': `color-mix(in srgb, ${colors.primary} 8%, white)`,
                '--brand-blue-100': `color-mix(in srgb, ${colors.primary} 15%, white)`,
                '--brand-blue-200': `color-mix(in srgb, ${colors.primary} 25%, white)`,
                '--brand-blue-300': `color-mix(in srgb, ${colors.primary} 45%, white)`,
                '--brand-blue-400': colors.accent,
                '--brand-blue-500': colors.primary,
                '--brand-blue-600': colors.sidebar,
                '--brand-blue-700': colors.sidebar,
                '--brand-blue-800': colors.sidebar,
                '--brand-blue-900': colors.sidebar,
                '--bg-sidebar': colors.sidebar,
                '--bg-sidebar-light': colors.accent,
                '--bg-sidebar-dark': colors.sidebar,
                '--text-primary': colors.sidebar,
                '--text-secondary': colors.primary,
                '--success': colors.accent,
                '--accent-teal': colors.accent
            };
            Object.entries(values).forEach(([property, value]) => document.documentElement.style.setProperty(property, value));
        }
        localStorage.setItem('color-theme', theme);
    }, [theme, user?.preferences?.customTheme]);

    // The account preference is authoritative after login/role switching, so
    // the same theme follows the user across browsers and devices.
    useEffect(() => {
        const accountTheme = user?.preferences?.colorTheme;
        if (accountTheme && (accountTheme === 'custom' || APP_THEMES.some(option => option.id === accountTheme))) {
            setTheme(accountTheme);
        }
    }, [user?.preferences?.colorTheme]);

    useEffect(() => {
        localStorage.setItem('date-format', dateFormat);
        // Dispatch custom event to let non-React modules (like dateFormatter.js) know about the change
        window.dispatchEvent(new Event('format-changed'));
    }, [dateFormat]);

    useEffect(() => {
        localStorage.setItem('time-format', timeFormat);
        window.dispatchEvent(new Event('format-changed'));
    }, [timeFormat]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, theme, setTheme, dateFormat, setDateFormat, timeFormat, setTimeFormat }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};


