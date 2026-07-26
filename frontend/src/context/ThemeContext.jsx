import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('color-theme') || 'orange';
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
        const themeClasses = ['theme-navy', 'theme-lavender', 'theme-rose-pink', 'theme-olive', 'theme-gold'];
        document.documentElement.classList.remove(...themeClasses);
        
        // Add current theme class if not default (orange)
        if (theme !== 'orange') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
        localStorage.setItem('color-theme', theme);
    }, [theme]);

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


