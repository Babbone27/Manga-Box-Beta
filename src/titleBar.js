// Title Bar Controller - Manages sync status and quick actions
import { getAllManga } from './db.js';
import { syncAllToCloud, restoreSession, signIn } from './services/googleDrive.js';
import { generateHTML } from './utils/htmlExport.js';
import { getSettings } from './settings.js';

let lastSyncTime = null;
let isSyncing = false;

// Load last sync time from localStorage
export const initTitleBar = async () => {
    const stored = localStorage.getItem('lastSyncTime');
    if (stored) {
        lastSyncTime = new Date(stored);
        updateSyncStatus();
    }

    // Attempt to restore session silently (if token exists)
    try {
        await restoreSession();
    } catch (e) {
        console.warn('Session restore deferred:', e);
    }

    // Update status every minute
    setInterval(() => {
        if (!isSyncing) updateSyncStatus();
    }, 60000);

    // Initialize button handlers
    setupButtonHandlers();
    setupEventListeners();
};

const setupEventListeners = () => {
    window.addEventListener('manga-synced', () => {
        updateLastSyncTime();
    });

    window.addEventListener('sync-progress', (e) => {
        const { current, total, type } = e.detail;
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            isSyncing = true;
            // E.g. "Upload: 5/100"
            statusEl.textContent = `☁️ ${type}: ${current}/${total}`;
        }
    });

    window.addEventListener('sync-complete', () => {
        isSyncing = false;
        updateLastSyncTime();
        // Force immediate update
        setTimeout(updateSyncStatus, 2000);
    });
};

// Update sync status text
const updateSyncStatus = () => {
    if (isSyncing) return; // Don't overwrite if syncing

    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;

    if (!lastSyncTime) {
        statusEl.textContent = '☁️ Never synced';
        return;
    }

    const now = new Date();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
        statusEl.textContent = '☁️ Sync adesso';
    } else if (minutes < 60) {
        statusEl.textContent = `☁️ Sync ${minutes} min fa`;
    } else if (hours < 24) {
        statusEl.textContent = `☁️ Sync ${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
    } else {
        statusEl.textContent = `☁️ Sync ${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
    }
};

// Handle sync button click
const handleSync = async () => {
    const btn = document.getElementById('sync-btn');
    const icon = btn.querySelector('.sync-icon');
    const statusEl = document.getElementById('sync-status');

    if (isSyncing) return;
    isSyncing = true;

    // Start animation
    icon.classList.add('spinning');
    statusEl.textContent = '☁️ Sync in corso...';
    btn.disabled = true;

    try {
        await syncAllToCloud();
        // Success handled by events, but we also ensure here
        updateLastSyncTime();
    } catch (error) {
        console.error('Sync error:', error);

        // Handle 401 (Auth Error)
        if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
            statusEl.textContent = '🔒 Autenticazione...';
            try {
                // Force sign in
                await signIn();
                // Retry sync
                statusEl.textContent = '☁️ Riprovo Sync...';
                await syncAllToCloud();
                updateLastSyncTime();
            } catch (retryError) {
                console.error('Retry failed:', retryError);
                statusEl.textContent = '☁️ Errore Auth';
            }
        } else {
            statusEl.textContent = '☁️ Errore sync';
        }
    } finally {
        isSyncing = false;
        icon.classList.remove('spinning');
        btn.disabled = false;
        setTimeout(updateSyncStatus, 3000);
    }
};

// Handle export button click
const handleExport = async () => {
    const statusEl = document.getElementById('sync-status');
    const originalText = statusEl.textContent;

    try {
        statusEl.textContent = 'Exporting...';
        const manga = await getAllManga();
        const libraryList = manga.filter(m => !m.collection || m.collection === 'library');
        const lettureList = manga.filter(m => m.collection === 'letture');
        const wishlistList = manga.filter(m => m.collection === 'wishlist');
        const settings = getSettings();
        generateHTML(libraryList, lettureList, wishlistList, settings.theme, settings.nickname || '');
        statusEl.textContent = 'Export completato!';
        setTimeout(() => {
            statusEl.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Export error:', error);
        statusEl.textContent = 'Errore export';
        setTimeout(() => {
            statusEl.textContent = originalText;
        }, 2000);
    }
};

// Setup button click handlers
const setupButtonHandlers = () => {
    const syncBtn = document.getElementById('sync-btn');
    const exportBtn = document.getElementById('export-btn');

    if (syncBtn) {
        syncBtn.addEventListener('click', handleSync);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
};

// Update sync time after manual sync (called from elsewhere)
export const updateLastSyncTime = () => {
    lastSyncTime = new Date();
    localStorage.setItem('lastSyncTime', lastSyncTime.toISOString());
    updateSyncStatus();
};
