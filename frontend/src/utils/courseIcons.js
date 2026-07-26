import {
    Code, Server, Database, Globe, Cpu, Smartphone,
    Palette, PenTool, Layout, Video, Camera,
    BarChart, TrendingUp, DollarSign, Briefcase,
    Shield, Lock, Wifi, Terminal,
    BookOpen, Layers, Monitor, Search,
    ShoppingCart, Truck, Home, Zap, Youtube, Activity
} from 'lucide-react';

/**
 * Returns a Lucide icon component based on the course category or title.
 * @param {string} category - The course category.
 * @param {string} title - The course title (fallback).
 * @returns {React.Component} - The Lucide icon component.
 */
export const getCourseIcon = (category, title = '') => {
    const term = (category || title).toLowerCase();

    // Specific mapping for the new list
    if (term.includes('office')) return Briefcase;
    if (term.includes('freelanc')) return Monitor; // Monitor used as fallback for freelance icon
    if (term.includes('marketing') || term.includes('ads') || term.includes('seo')) return TrendingUp;
    if (term.includes('video') || term.includes('youtub')) return Video;
    if (term.includes('graphic') || term.includes('design')) return Palette;
    if (term.includes('commerce')) return ShoppingCart;
    if (term.includes('architecture')) return Home;
    if (term.includes('web') && term.includes('without')) return Globe; // Globe+Zap concept, simplified to Globe
    if (term.includes('web')) return Globe;
    if (term.includes('app') && term.includes('without')) return Smartphone;
    if (term.includes('app')) return Smartphone;
    if (term.includes('security')) return Shield;
    if (term.includes('machine') || term.includes('ai')) return Cpu;
    if (term.includes('iot') || term.includes('internet')) return Wifi;
    if (term.includes('program') || term.includes('soft')) return Terminal;
    if (term.includes('tax')) return DollarSign;
    if (term.includes('trading')) return Activity;
    if (term.includes('truck')) return Truck;
    if (term.includes('react') || term.includes('node') || term.includes('js')) return Code;

    // Fallbacks
    if (term.includes('layout')) return Layout;
    if (term.includes('layer')) return Layers;
    if (term.includes('server')) return Server;
    if (term.includes('data')) return Database;

    return BookOpen;
};

/**
 * Returns a color class string based on the category/title.
 */
export const getCourseColor = (category, title = '') => {
    const term = (category || title).toLowerCase();

    if (term.includes('web')) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (term.includes('react') || term.includes('node') || term.includes('js')) return 'text-sky-700 bg-sky-100 border-sky-200';
    if (term.includes('ai') || term.includes('machine') || term.includes('data')) return 'text-purple-700 bg-purple-100 border-purple-200';
    if (term.includes('design') || term.includes('graphic') || term.includes('office')) return 'text-pink-700 bg-pink-100 border-pink-200';
    if (term.includes('app') || term.includes('mobile')) return 'text-lime-700 bg-lime-100 border-lime-200';
    if (term.includes('security') || term.includes('cyber')) return 'text-red-700 bg-red-100 border-red-200';
    if (term.includes('cloud') || term.includes('devops') || term.includes('iot')) return 'text-cyan-700 bg-cyan-100 border-cyan-200';
    if (term.includes('mark') || term.includes('seo') || term.includes('aad') || term.includes('trading')) return 'text-orange-700 bg-orange-100 border-orange-200';
    if (term.includes('video') || term.includes('youtub')) return 'text-rose-700 bg-rose-100 border-rose-200';
    if (term.includes('finance') || term.includes('tax') || term.includes('commerce')) return 'text-primary bg-primary border-primary';
    if (term.includes('truck') || term.includes('archit')) return 'text-amber-700 bg-amber-100 border-amber-200';
    if (term.includes('freelanc')) return 'text-indigo-700 bg-indigo-100 border-indigo-200';

    return 'text-indigo-700 bg-indigo-100 border-indigo-200'; // Default
};

/**
 * Returns a style object with icon, text color, background, and gradient.
 */
export const getCourseStyle = (category, title = '') => {
    const term = (category || title).toLowerCase();

    // Default
    let style = {
        icon: BookOpen,
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        gradient: 'from-indigo-500 to-purple-600'
    };

    if (term.includes('web')) {
        style = { icon: Globe, text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-500 to-cyan-500' };
    } else if (term.includes('react') || term.includes('node') || term.includes('js') || term.includes('soft') || term.includes('program')) {
        style = { icon: Code, text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', gradient: 'from-sky-500 to-blue-600' };
    } else if (term.includes('ai') || term.includes('machine') || term.includes('data')) {
        style = { icon: Cpu, text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', gradient: 'from-purple-500 to-pink-500' };
    } else if (term.includes('design') || term.includes('graphic') || term.includes('ui')) {
        style = { icon: Palette, text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', gradient: 'from-pink-500 to-rose-500' };
    } else if (term.includes('app') || term.includes('mobile')) {
        style = { icon: Smartphone, text: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-100', gradient: 'from-lime-500 to-green-500' };
    } else if (term.includes('security') || term.includes('cyber')) {
        style = { icon: Shield, text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', gradient: 'from-red-500 to-orange-500' };
    } else if (term.includes('iot') || term.includes('cloud')) {
        style = { icon: Wifi, text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', gradient: 'from-cyan-500 to-blue-500' };
    } else if (term.includes('market') || term.includes('seo') || term.includes('ad') || term.includes('trading')) {
        style = { icon: TrendingUp, text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', gradient: 'from-orange-500 to-amber-500' };
    } else if (term.includes('video') || term.includes('youtub')) {
        style = { icon: Video, text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', gradient: 'from-rose-500 to-pink-600' };
    } else if (term.includes('finance') || term.includes('tax') || term.includes('commerce') || term.includes('money')) {
        style = { icon: DollarSign, text: 'text-primary', bg: 'bg-primary', border: 'border-primary', gradient: 'from-primary to-primary' };
    } else if (term.includes('office') || term.includes('freelanc')) {
        style = { icon: Briefcase, text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', gradient: 'from-slate-700 to-gray-800' };
    } else if (term.includes('truck')) {
        style = { icon: Truck, text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', gradient: 'from-amber-500 to-orange-600' };
    } else if (term.includes('archit') || term.includes('home')) {
        style = { icon: Home, text: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-100', gradient: 'from-stone-500 to-gray-500' };
    }

    return style;
};

