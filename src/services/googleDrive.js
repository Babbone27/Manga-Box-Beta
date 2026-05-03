import { getSettings } from '../settings.js';

const CLIENT_ID = '940335566698-9iu2od5vctlhbat711pt0m68m2mnppke.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Dynamic Script Loader
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.getAttribute('data-loaded') === 'true') return resolve();
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            script.setAttribute('data-loaded', 'true');
            resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

let initPromise = null;

export const initGoogleDrive = () => {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            await Promise.all([
                loadScript('https://apis.google.com/js/api.js'),
                loadScript('https://accounts.google.com/gsi/client')
            ]);

            await new Promise((resolve) => gapi.load('client', resolve));
            await gapi.client.init({
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            gapiInited = true;

            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
            });
            gisInited = true;
            console.log('Google Drive API Initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Google Drive:', error);
            initPromise = null;
            return false;
        }
    })();
    
    return initPromise;
};

export const restoreSession = async () => {
    if (!gapiInited || !gisInited) await initGoogleDrive();
    const stored = localStorage.getItem('gdrive_token');
    if (stored) {
        try {
            const token = JSON.parse(stored);
            if (!token.expires_at || Date.now() > (token.expires_at - 300000)) {
                console.warn('Google Drive token expired, clearing session.');
                localStorage.removeItem('gdrive_token');
                return false;
            }
            gapi.client.setToken(token);
            return true;
        } catch (e) {
            console.error('Invalid stored token', e);
            localStorage.removeItem('gdrive_token');
        }
    }
    return false;
};

const getToken = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) return reject('Google Auth not initialized');

        const currentToken = gapi.client.getToken();
        if (currentToken && currentToken.access_token) {
            if (currentToken.expires_at && Date.now() < (currentToken.expires_at - 300000)) {
                return resolve(currentToken);
            }
        }

        tokenClient.callback = (resp) => {
            if (resp.error) return reject(resp);
            resp.expires_at = Date.now() + (resp.expires_in * 1000);
            gapi.client.setToken(resp);
            localStorage.setItem('gdrive_token', JSON.stringify(resp));
            resolve(resp);
        };
        tokenClient.requestAccessToken({ prompt: currentToken ? '' : 'consent' });
    });
};

// --- Drive API Helpers ---

const findFile = async (filename, parentId = null) => {
    let query = `name = '${filename}' and trashed = false`;
    if (parentId) query += ` and '${parentId}' in parents`;

    const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive',
    });
    return response.result.files[0] || null;
};

const createFolder = async (name) => {
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const response = await gapi.client.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });
    return response.result.id;
};

const getOrCreateFolder = async (name) => {
    const existing = await findFile(name);
    if (existing) return existing.id;
    return await createFolder(name);
};

const uploadFile = async (name, content, mimeType, parentId = null, fileId = null) => {
    const metadata = {
        name: name,
        mimeType: mimeType,
    };
    if (parentId) metadata.parents = [parentId];

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', content);

    const accessToken = gapi.client.getToken().access_token;
    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
    }

    const response = await fetch(url, {
        method: method,
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form,
    });
    return await response.json();
};

const downloadFile = async (fileId) => {
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
    });
    return response.result; // For text/json
};

export const checkCloudBackupNewer = async () => {
    if (!gapi.client.getToken()) return false;
    
    try {
        const file = await findFile('manga_db.json');
        if (!file) return { hasCloudBackup: false, isNewer: false };
        
        const cloudTime = new Date(file.modifiedTime).getTime();
        
        let localTime = 0;
        const storedLocal = localStorage.getItem('lastSyncTime');
        if (storedLocal) {
            localTime = new Date(storedLocal).getTime();
        }
        
        // Give it a 60 seconds margin
        const isNewer = cloudTime > (localTime + 60000) || localTime === 0; 
        
        return {
            hasCloudBackup: true,
            isNewer,
            cloudDate: new Date(cloudTime).toLocaleString()
        };
    } catch (e) {
        console.error('Error checking cloud backup time', e);
        return { hasCloudBackup: false, isNewer: false };
    }
};


// --- Business Logic ---

export const signIn = async () => {
    if (!gapiInited || !gisInited) await initGoogleDrive();
    
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error('Google Auth not initialized'));
        }
        tokenClient.callback = (resp) => {
            if (resp.error) return reject(resp);
            resp.expires_at = Date.now() + (resp.expires_in * 1000);
            gapi.client.setToken(resp);
            localStorage.setItem('gdrive_token', JSON.stringify(resp));
            resolve(true);
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export const signOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('gdrive_token');
    }
};

export const syncAllToCloud = async () => {
    if (!gapi.client.getToken()) await getToken();

    const { getAllManga } = await import('../db.js');

    const allManga = await getAllManga();

    // 1. Sync Manga Data
    // Prepared data: remove huge Base64 covers
    const cleanData = allManga.map(m => {
        const { coverUrl, ...rest } = m;
        // Keep coverUrl only if it's NOT a data URI (e.g. standard http link)
        if (coverUrl && coverUrl.startsWith('data:')) {
            return rest; // Remove base64
        }
        return { ...rest, coverUrl };
    });

    // Find or Create manga_db.json
    // Find or create manga_db.json
    const dbFile = await findFile('manga_db.json');
    const dbFileId = dbFile ? dbFile.id : null;

    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    await uploadFile('manga_db.json', blob, 'application/json', null, dbFileId);
    console.log('Text data synced to Drive');

    window.dispatchEvent(new CustomEvent('manga-synced'));
    return cleanData.length;
};

// Upload Cover Images Logic
export const uploadCoversToCloud = async (onProgress) => {
    if (!gapi.client.getToken()) await getToken();

    const folderId = await getOrCreateFolder('MangaBox_Covers');
    const { getAllManga } = await import('../db.js');
    const allManga = await getAllManga();

    let count = 0;
    const total = allManga.length;

    for (const manga of allManga) {
        if (manga.coverUrl && manga.coverUrl.startsWith('data:image')) {
            // Check if file exists on Drive (by title-slug)
            const slug = manga.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const ext = manga.coverUrl.includes('image/png') ? 'png' : 'jpg';
            const filename = `${slug}.${ext}`;

            const existing = await findFile(filename, folderId);
            if (!existing) {
                // Convert Base64 to Blob
                const fetchRes = await fetch(manga.coverUrl);
                const blob = await fetchRes.blob();

                await uploadFile(filename, blob, blob.type, folderId);
            }
        }
        count++;
        if (onProgress) onProgress(count, total);
        window.dispatchEvent(new CustomEvent('sync-progress', { detail: { current: count, total, type: 'Upload' } }));
    }
    window.dispatchEvent(new CustomEvent('sync-complete'));
    return count;
};

export const downloadCoversFromCloud = async (onProgress) => {
    if (!gapi.client.getToken()) await getToken();

    const folderId = await getOrCreateFolder('MangaBox_Covers');
    const { getAllManga, updateManga } = await import('../db.js');
    const allManga = await getAllManga();

    let count = 0;
    const total = allManga.length;

    for (const manga of allManga) {
        // Only download if we don't have a cover
        if (!manga.coverUrl) {
            const slug = manga.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            // Try jpg then png
            let file = await findFile(`${slug}.jpg`, folderId);
            if (!file) file = await findFile(`${slug}.png`, folderId);

            if (file) {
                // Download content
                const accessToken = gapi.client.getToken().access_token;
                const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const blob = await resp.blob();

                // Convert to Base64 for IDB
                const reader = new FileReader();
                const base64 = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                manga.coverUrl = base64;
                await updateManga(manga, true); // true = skip cloud sync
            }
        }
        count++;
        if (onProgress) onProgress(count, total);
        window.dispatchEvent(new CustomEvent('sync-progress', { detail: { current: count, total, type: 'Download' } }));
    }
    window.dispatchEvent(new CustomEvent('sync-complete'));
};

export const fetchFromCloud = async () => {
    if (!gapi.client.getToken()) await getToken();

    // 1. Fetch Manga Data
    const file = await findFile('manga_db.json');
    let mangaData = [];
    if (file) {
        mangaData = await downloadFile(file.id);
    }

    return mangaData; // Return manga data for db.js to handle
};

// --- Compatibility Shims for db.js ---
// These debounce the actual sync to avoid hammering the API
let debounceTimer;
export const syncMangaToCloud = async (manga) => {
    const { getSettings } = await import('../settings.js');
    const settings = getSettings();

    // If autoSync is explicitly false, skip. Default is true.
    if (settings.autoSync === false) return;

    const hasToken = gapiInited && window.gapi && gapi.client && gapi.client.getToken && gapi.client.getToken();
    if (!hasToken) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        syncAllToCloud().catch(err => console.error('Auto-sync failed:', err));
    }, 5000); // 5 second debounce
};

export const deleteMangaFromCloud = async (id) => {
    syncMangaToCloud();
};

export const fetchAllFromCloud = async () => {
    return fetchFromCloud();
};

export const uploadAllToCloud = async (list) => {
    return syncAllToCloud();
};

export const deleteAllRemoteManga = async () => {
    if (!gapi.client.getToken()) await getToken();
    const dbFile = await findFile('manga_db.json');
    const dbFileId = dbFile ? dbFile.id : null;
    const blob = new Blob([JSON.stringify([], null, 2)], { type: 'application/json' });
    await uploadFile('manga_db.json', blob, 'application/json', null, dbFileId);
    console.log('Remote manga data cleared');
};
