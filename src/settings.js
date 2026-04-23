import { getTheme } from './themes.js';

const SETTINGS_KEY = 'mangadb-settings';

// Default settings
const defaultSettings = {
    theme: 'Tokyo Night Storm',
    gridColumns: 5,
    geminiApiKey: '',
    nickname: '',
    autoSync: true
};

// Load settings from localStorage
export const getSettings = () => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    return defaultSettings;
};

// Save settings to localStorage
export const saveSettings = (settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
        console.error('Failed to save settings:', err);
    }
};

// Apply theme to document root
export const applyTheme = (themeName) => {
    const theme = getTheme(themeName);
    const root = document.documentElement;

    if (!theme) return;

    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--surface-color', theme.surface);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--secondary-text-color', theme.secondaryText);
    root.style.setProperty('--success-color', theme.success);
    root.style.setProperty('--warning-color', theme.warning);
    root.style.setProperty('--error-color', theme.error);
    root.style.setProperty('--border-color', theme.borderColor || 'rgba(255,255,255,0.1)');
    root.style.setProperty('--item-bg-color', theme.itemBg || 'rgba(255,255,255,0.05)');
    root.style.setProperty('--hover-bg-color', theme.hoverBg || 'rgba(255,255,255,0.1)');
    root.style.setProperty('--active-tab-bg', theme.activeTabBg || 'rgba(125, 207, 255, 0.15)');

    // Update meta theme-color for mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme.surface);
    }
};
