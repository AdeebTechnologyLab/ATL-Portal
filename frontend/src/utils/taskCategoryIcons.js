import {
    Globe, Cpu, Smartphone, Palette, Grid, Monitor, Briefcase, Megaphone,
    Video, PenTool, ShoppingCart, Layout, Youtube, Home, Code, Shield,
    Brain, Wifi, Terminal, Calculator, TrendingUp, Truck, Layers
} from 'lucide-react';

// Map categories to icons and colors
const categoryConfig = {
    // Legacy categories
    'web': { icon: Globe, color: 'text-blue-700', bg: 'bg-blue-100' },
    'ai': { icon: Cpu, color: 'text-purple-700', bg: 'bg-purple-100' },
    'mobile': { icon: Smartphone, color: 'text-green-700', bg: 'bg-green-100' },
    'design': { icon: Palette, color: 'text-pink-700', bg: 'bg-pink-100' },
    'other': { icon: Grid, color: 'text-gray-700', bg: 'bg-gray-100' },
    
    // New categories
    'Office Work [IT]': { icon: Monitor, color: 'text-slate-700', bg: 'bg-slate-100' },
    'Freelancing': { icon: Briefcase, color: 'text-amber-700', bg: 'bg-amber-100' },
    'Digital Marketing, Ads': { icon: Megaphone, color: 'text-orange-700', bg: 'bg-orange-100' },
    'Video Editing': { icon: Video, color: 'text-red-700', bg: 'bg-red-100' },
    'Graphic Designer': { icon: PenTool, color: 'text-fuchsia-700', bg: 'bg-fuchsia-100' },
    'E-Commerce': { icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary' },
    'UX/UI Designing': { icon: Layout, color: 'text-indigo-700', bg: 'bg-indigo-100' },
    'Youtuber Course': { icon: Youtube, color: 'text-red-700', bg: 'bg-red-100' },
    'Home Architecture': { icon: Home, color: 'text-primary', bg: 'bg-primary' },
    'Web Development': { icon: Globe, color: 'text-blue-700', bg: 'bg-blue-100' },
    'App Development': { icon: Smartphone, color: 'text-green-700', bg: 'bg-green-100' },
    'App Dev Without Coding': { icon: Smartphone, color: 'text-lime-700', bg: 'bg-lime-100' },
    'Web Dev Without Coding': { icon: Globe, color: 'text-cyan-700', bg: 'bg-cyan-100' },
    'Cyber Security': { icon: Shield, color: 'text-rose-700', bg: 'bg-rose-100' },
    'Machine learning': { icon: Brain, color: 'text-violet-700', bg: 'bg-violet-100' },
    'Internet of Thing [IOT]': { icon: Wifi, color: 'text-sky-700', bg: 'bg-sky-100' },
    'Programming': { icon: Terminal, color: 'text-zinc-700', bg: 'bg-zinc-100' },
    'Taxation': { icon: Calculator, color: 'text-stone-700', bg: 'bg-stone-100' },
    'Trading': { icon: TrendingUp, color: 'text-primary', bg: 'bg-primary' },
    'Truck Dispatching': { icon: Truck, color: 'text-amber-700', bg: 'bg-amber-100' },
    'Software Development': { icon: Layers, color: 'text-indigo-700', bg: 'bg-indigo-100' }
};

// Default config for unknown categories
const defaultConfig = { icon: Grid, color: 'text-gray-700', bg: 'bg-gray-100' };

/**
 * Get the icon component for a category
 * @param {string} category - The task category
 * @returns {React.ComponentType} - The Lucide icon component
 */
export const getCategoryIcon = (category) => {
    return categoryConfig[category]?.icon || defaultConfig.icon;
};

/**
 * Get the color class for a category
 * @param {string} category - The task category
 * @returns {string} - Tailwind color class
 */
export const getCategoryColor = (category) => {
    return categoryConfig[category]?.color || defaultConfig.color;
};

/**
 * Get the background class for a category
 * @param {string} category - The task category
 * @returns {string} - Tailwind background class
 */
export const getCategoryBg = (category) => {
    return categoryConfig[category]?.bg || defaultConfig.bg;
};

/**
 * Get full config for a category
 * @param {string} category - The task category
 * @returns {{ icon: React.ComponentType, color: string, bg: string }}
 */
export const getCategoryConfig = (category) => {
    return categoryConfig[category] || defaultConfig;
};

export default categoryConfig;

