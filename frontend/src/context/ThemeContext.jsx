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
        document.documentElement.classList.remove(...themeClasses);
        
        // Add current theme class if not default (orange)
        if (theme !== 'orange') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
        localStorage.setItem('color-theme', theme);
    }, [theme]);

    // The account preference is authoritative after login/role switching, so
    // the same theme follows the user across browsers and devices.
    useEffect(() => {
        const accountTheme = user?.preferences?.colorTheme;
        if (accountTheme && APP_THEMES.some(option => option.id === accountTheme)) {
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


