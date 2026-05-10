import { openDB } from 'idb';
import { syncMangaToCloud, deleteMangaFromCloud, fetchAllFromCloud } from './services/googleDrive.js';
import { addHistoryEntry, generateDiff } from './services/history.js';
import { DB_NAME, DB_VERSION } from './dbConfig.js';

let dbPromise = null;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('manga')) {
                    const store = db.createObjectStore('manga', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('title', 'title');
                }
                if (!db.objectStoreNames.contains('history')) {
                    db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                }
            },
        });
    }
    return dbPromise;
};


export const addManga = async (manga) => {
    const db = await initDB();

    // Check for duplicates
    const tx = db.transaction('manga', 'readonly');
    const index = tx.store.index('title');
    const existing = await index.get(manga.title);
    if (existing) {
        throw new Error('Un manga con questo titolo esiste già!');
    }

    const mangaWithDate = {
        ...manga,
        dateAdded: new Date().toISOString()
    };
    const id = await db.add('manga', mangaWithDate);

    // 1. Log History
    await addHistoryEntry({
        opera: manga.title,
        azione: ['Pagina manga creata']
    });

    // Sync to Cloud
    await syncMangaToCloud({ ...mangaWithDate, id });

    return id;
};

export const bulkAddManga = async (mangaList) => {
    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    const store = tx.objectStore('manga');

    const itemsToSync = [];
    const now = new Date().toISOString();

    const allManga = await store.getAll();
    const titleMap = new Map();
    for (const m of allManga) {
        if (m.title) titleMap.set(m.title.toLowerCase().trim(), m);
    }

    for (const manga of mangaList) {
        const mangaWithDate = {
            ...manga,
            dateAdded: manga.dateAdded || now
        };
        
        const normalizedTitle = mangaWithDate.title ? mangaWithDate.title.toLowerCase().trim() : '';
        const existing = titleMap.get(normalizedTitle);

        if (existing) {
            mangaWithDate.id = existing.id;
            await store.put(mangaWithDate);
            itemsToSync.push(mangaWithDate);
        } else {
            const { id, ...mangaData } = mangaWithDate;
            const newId = await store.add(mangaData);
            const newEntry = { ...mangaData, id: newId };
            itemsToSync.push(newEntry);
            if (normalizedTitle) titleMap.set(normalizedTitle, newEntry);
        }
    }

    await tx.done;

    // 1. Log History (Bulk)
    if (mangaList.length > 0) {
        await addHistoryEntry({
            opera: 'Importazione Massiva',
            azione: [`Importati ${mangaList.length} manga`]
        });
    }

    // Batch Sync to Cloud
    if (itemsToSync.length > 0) {
        const { syncMangaToCloud } = await import('./services/googleDrive.js');
        try {
            await syncMangaToCloud();
        } catch (err) {
            console.error('Bulk sync request failed:', err);
        }
    }

    return itemsToSync.length;
};

export const getAllManga = async () => {
    const db = await initDB();
    return db.getAll('manga');
};

export const getManga = async (id) => {
    const db = await initDB();
    return db.get('manga', id);
};

export const updateManga = async (manga, skipSync = false) => {
    const db = await initDB();

    // Ensure ID is a number
    if (manga.id && typeof manga.id !== 'number') {
        const numId = Number(manga.id);
        if (!isNaN(numId)) {
            // If we are converting string to number, delete the old string key first
            // otherwise .put() with new number key creates a copy
            await db.delete('manga', manga.id);
            manga.id = numId;
        }
    }

    // 1. Fetch old state for diff
    let oldManga = null;
    try {
        oldManga = await db.get('manga', manga.id);
    } catch (e) { console.warn('Could not fetch old manga for diff', e); }

    const result = await db.put('manga', manga);

    // 2. Log History
    if (oldManga) {
        const changes = generateDiff(oldManga, manga);
        if (changes.length > 0) {
            await addHistoryEntry({
                opera: manga.title,
                azione: changes
            });
        }
    }

    // Sync to Cloud
    if (!skipSync) {
        await syncMangaToCloud(manga);
    }

    return result;
};

export const deleteManga = async (id) => {
    const db = await initDB();

    // 1. Fetch for name
    let title = 'Manga Sconosciuto';
    try {
        const m = await db.get('manga', id);
        if (m) title = m.title;
    } catch (e) { }

    const result = await db.delete('manga', id);

    // 2. Log History
    await addHistoryEntry({
        opera: title,
        azione: ['Pagina manga eliminata']
    });

    // Sync to Cloud
    await deleteMangaFromCloud(id);

    return result;
};

export const deleteAllManga = async () => {
    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    await tx.objectStore('manga').clear();
    await tx.done;

    await addHistoryEntry({
        opera: 'Sistema',
        azione: ['Database svuotato completamente']
    });

    // Note: We might want to be careful about deleting everything from cloud automatically
    // For now, let's keep it local-only or require explicit cloud clear
};

export const backfillDates = async () => {
    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    const store = tx.objectStore('manga');

    let cursor = await store.openCursor();
    let count = 0;
    const now = new Date().toISOString();

    while (cursor) {
        const manga = cursor.value;
        if (!manga.dateAdded) {
            manga.dateAdded = now;
            await cursor.update(manga);
            count++;
        }
        cursor = await cursor.continue();
    }
    await tx.done;
    return count;
};

export const syncFromCloud = async () => {
    const cloudData = await fetchAllFromCloud();
    if (!cloudData) return 0;

    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    const store = tx.objectStore('manga');

    // 1. Load all local manga to create a Title Map for smarter merging
    const allLocal = await store.getAll();
    const localTitleMap = new Map();
    allLocal.forEach(m => {
        if (m.title) localTitleMap.set(m.title.toLowerCase().trim(), m);
    });

    let count = 0;
    for (const cloudManga of cloudData) {
        // Normalize cloud title
        const cloudTitleNorm = cloudManga.title ? cloudManga.title.toLowerCase().trim() : '';
        
        // 2. Try to find a match: either by ID or by Title
        let existingManga = await store.get(cloudManga.id);
        
        // If not found by ID, try finding by title (handles cases where IDs differ between devices)
        if (!existingManga && cloudTitleNorm) {
            existingManga = localTitleMap.get(cloudTitleNorm);
        }

        // 3. Merge: cloud data + local coverUrl (if exists)
        // CRITICAL: We MUST preserve the local ID if found, otherwise .put() creates a duplicate or overwrites an unrelated manga
        const mergedManga = {
            ...cloudManga,
            id: existingManga ? existingManga.id : cloudManga.id,
            coverUrl: existingManga?.coverUrl || cloudManga.coverUrl || null
        };

        await store.put(mergedManga);
        count++;
    }
    await tx.done;
    return count;
};

export const pushToCloud = async () => {
    const mangaList = await getAllManga();
    if (mangaList.length === 0) return 0;

    return await uploadAllToCloud(mangaList);
};

export const restoreCoversLocal = async (mangaList) => {
    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    const store = tx.objectStore('manga');
    
    const allLocal = await store.getAll();
    const localTitleMap = new Map();
    allLocal.forEach(m => {
        if (m.title) localTitleMap.set(m.title.toLowerCase().trim(), m);
    });

    let count = 0;
    for (const backupManga of mangaList) {
        if (!backupManga.coverUrl) continue;
        
        const titleNorm = backupManga.title ? backupManga.title.toLowerCase().trim() : '';
        let existingManga = await store.get(backupManga.id);
        
        if (!existingManga && titleNorm) {
            existingManga = localTitleMap.get(titleNorm);
        }

        if (existingManga) {
            existingManga.coverUrl = backupManga.coverUrl;
            await store.put(existingManga);
            count++;
        }
    }
    await tx.done;
    return count;
};

export const wipeAndUploadToCloud = async () => {
    const { deleteAllRemoteManga } = await import('./services/googleDrive.js');

    // 1. Delete all remote data
    await deleteAllRemoteManga();

    // 2. Upload all local data
    return await pushToCloud();
};

// Functions for Real-time Sync (Local Only - No Cloud Push)
export const upsertMangaLocal = async (manga) => {
    const db = await initDB();

    // Ensure ID is a number
    if (manga.id && typeof manga.id !== 'number') {
        const numId = Number(manga.id);
        if (!isNaN(numId)) {
            manga.id = numId;
        }
    }

    // Check for potential string-ID duplicate and remove it
    if (manga.id) {
        const stringId = String(manga.id);
        // Only check if we are inserting a number, to see if a string legacy exists
        if (typeof manga.id === 'number') {
            const existingString = await db.get('manga', stringId);
            if (existingString) {
                console.log(`Removing duplicate string-ID manga: ${stringId}`);
                await db.delete('manga', stringId);
            }
        }
    }

    return db.put('manga', manga);
};

export const deleteMangaLocal = async (id) => {
    const db = await initDB();
    return db.delete('manga', id);
};

export const cleanupCloudDuplicates = async () => {
    return await cleanupLocalDuplicates();
};

export const cleanupLocalDuplicates = async () => {
    const db = await initDB();
    const tx = db.transaction('manga', 'readwrite');
    const store = tx.objectStore('manga');
    const allManga = await store.getAll();

    // Group by title
    const groups = {};
    allManga.forEach(manga => {
        const title = manga.title ? manga.title.toLowerCase().trim() : 'unknown';
        if (!groups[title]) groups[title] = [];
        groups[title].push(manga);
    });

    let deletedCount = 0;
    const idsToDelete = [];

    Object.values(groups).forEach(group => {
        if (group.length > 1) {
            // Sort by dateAdded ascending (Oldest first)
            group.sort((a, b) => {
                const dateA = new Date(a.dateAdded || 0).getTime();
                const dateB = new Date(b.dateAdded || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.id > b.id ? 1 : -1;
            });

            // Keep the first one, delete the rest
            const toDelete = group.slice(1);
            toDelete.forEach(m => idsToDelete.push(m.id));
        }
    });

    for (const id of idsToDelete) {
        await store.delete(id);
        deletedCount++;
    }

    await tx.done;
    return { deleted: deletedCount, scanned: allManga.length };
};
