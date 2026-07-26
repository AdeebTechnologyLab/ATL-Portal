import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Hook to detect dark mode from html element class
const useDarkMode = () => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
};

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

// Bar Chart Component
export const BarChart = ({
    data,
    options = {},
    height = 300,
}) => {
    const isDark = useDarkMode();
    const tickColor = isDark ? '#94a3b8' : '#64748B';
    const gridColor = isDark ? '#252b3b' : '#F1F5F9';

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: isDark ? '#0f1117' : '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: tickColor, font: { size: 11 } },
            },
            y: {
                grid: { color: gridColor },
                ticks: { color: tickColor, font: { size: 11 } },
            },
        },
    };

    return (
        <div style={{ height }}>
            <Bar data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};

// Doughnut Chart Component
export const DoughnutChart = ({
    data,
    options = {},
    height = 250,
}) => {
    const isDark = useDarkMode();
    const labelColor = isDark ? '#94a3b8' : '#64748B';

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 12 },
                    color: labelColor,
                },
            },
            tooltip: {
                backgroundColor: isDark ? '#0f1117' : '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
    };

    return (
        <div style={{ height }}>
            <Doughnut data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};

// Line Chart Component
export const LineChart = ({
    data,
    options = {},
    height = 300,
}) => {
    const isDark = useDarkMode();
    const tickColor = isDark ? '#94a3b8' : '#64748B';
    const gridColor = isDark ? '#252b3b' : '#F1F5F9';
    const labelColor = isDark ? '#94a3b8' : '#64748B';

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 12 },
                    color: labelColor,
                },
            },
            tooltip: {
                backgroundColor: isDark ? '#0f1117' : '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: tickColor, font: { size: 11 } },
            },
            y: {
                grid: { color: gridColor },
                ticks: { color: tickColor, font: { size: 11 } },
            },
        },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 4, hoverRadius: 6 },
        },
    };

    return (
        <div style={{ height }}>
            <Line data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};


