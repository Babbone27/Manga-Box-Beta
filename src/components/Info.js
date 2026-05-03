import { h } from 'preact';
import { html } from 'htm/preact';
import { useState, useEffect } from 'preact/hooks';
import { getAllManga, addManga, deleteAllManga } from '../db.js';
import { getThemeNames } from '../themes.js';
import HistoryLog from './HistoryLog.js';

import { isMobile } from '../utils/platform.js';

// Help Tooltip Component
const HelpTooltip = ({ text }) => {
  const [show, setShow] = useState(false);

  return html`
    <span 
      style="position: relative; display: inline-flex; align-items: center; margin-left: 8px; cursor: help; vertical-align: middle;"
      onMouseEnter=${() => setShow(true)}
      onMouseLeave=${() => setShow(false)}
    >
      <span style="
        width: 18px; 
        height: 18px; 
        border-radius: 50%; 
        background: rgba(255,255,255,0.1); 
        color: var(--secondary-text-color); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 12px; 
        font-weight: bold;
        border: 1px solid var(--border-color);
      ">?</span>
      
      ${show && html`
        <span style="
          position: absolute; 
          bottom: 100%; 
          left: 50%; 
          transform: translateX(-50%); 
          background: #000; 
          color: #fff; 
          padding: 8px 12px; 
          border-radius: 6px; 
          font-size: 12px; 
          width: 220px; 
          z-index: 100; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
          margin-bottom: 8px;
          line-height: 1.4;
          text-align: center;
          border: 1px solid var(--border-color);
          display: block;
        ">
          ${text}
          <span style="
            position: absolute; 
            top: 100%; 
            left: 50%; 
            margin-left: -6px; 
            border-width: 6px; 
            border-style: solid; 
            border-color: #000 transparent transparent transparent;
            display: block;
          "></span>
        </span>
      `}
    </span>
  `;
};

import Modal from './Modal.js';

export default function Info({ onRefresh, settings, onSettingsChange, onOpenHistory }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'info' or 'confirm'
    onConfirm: () => { },
    onCancel: () => { }
  });

  const [showChangelog, setShowChangelog] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'theme' or null

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && !e.target.closest('.custom-select-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const showModal = (title, message, type = 'info', onConfirm = () => { }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { restoreSession } = await import('../services/googleDrive.js');
        const restored = await restoreSession();
        if (restored) setIsGoogleConnected(true);
      } catch (e) {
        console.error('Session restore failed', e);
      }
    };
    checkSession();
  }, []);

  // Google Drive Handlers
  const handleGoogleLogin = async () => {
    try {
      const { signIn, checkCloudBackupNewer } = await import('../services/googleDrive.js');
      await signIn();
      setIsGoogleConnected(true);
      
      showModal('Info', 'Controllo backup in corso...', 'info');
      const backupInfo = await checkCloudBackupNewer();
      
      if (backupInfo && backupInfo.hasCloudBackup && backupInfo.isNewer) {
        setModalState({
            isOpen: true,
            title: '⚠️ Backup Recente Trovato',
            message: `Attenzione: nel cloud è presente un backup del ${backupInfo.cloudDate}, che è più recente dei tuoi dati locali.\n\nTi consigliamo di scaricare i dati dal Cloud per evitare di sovrascriverli accidentalmente con quelli vecchi.`,
            type: 'info',
            onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })),
            onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        showModal('Successo', 'Account Google collegato correttamente!');
      }
    } catch (e) {
      console.error(e);
      showModal('Errore', 'Login fallito: ' + (e.message || e));
    }
  };

  const handleGoogleLogout = async () => {
    try {
      const { signOut } = await import('../services/googleDrive.js');
      signOut();
      setIsGoogleConnected(false);
      showModal('Info', 'Disconnesso da Google Drive.');
    } catch (e) { console.error(e); }
  };

  const handleSyncText = async (direction) => { // 'push' or 'pull'
    if (!isGoogleConnected) return showModal('Errore', 'Connettiti prima a Google Drive.');

    try {
      if (direction === 'push') {
        showModal('Sync', 'Caricamento dati in corso...', 'info');
        const { syncAllToCloud } = await import('../services/googleDrive.js');
        const count = await syncAllToCloud();
        showModal('Successo', `Caricati ${count} manga su Drive (manga_db.json).`);
      } else {
        showModal('Sync', 'Scaricamento dati in corso...', 'info');
        const { syncFromCloud } = await import('../db.js'); // Uses fetchFromCloud internally
        const count = await syncFromCloud();
        showModal('Successo', `Scaricati ${count} manga da Drive.`, 'info', () => {
          // Reload to show changes
          if (onRefresh) onRefresh();
        });
      }
    } catch (e) {
      showModal('Errore', 'Sync fallito: ' + e.message);
    }
  };

  const handleSyncCovers = async (type) => { // 'upload' or 'download'
    if (!isGoogleConnected) return showModal('Errore', 'Connettiti prima a Google Drive.');

    if (type === 'upload') {
      showModal('Upload Copertine', 'Inizio upload copertine... Potrebbe richiedere tempo.', 'info');
      const { uploadCoversToCloud } = await import('../services/googleDrive.js');
      await uploadCoversToCloud((curr, total) => {
        // Optional: progress feedback
        console.log(`Upload: ${curr}/${total}`);
      });
      showModal('Successo', 'Upload copertine completato!');
    } else {
      showModal('Download Copertine', 'Ricerca e download copertine mancanti...', 'info');
      const { downloadCoversFromCloud } = await import('../services/googleDrive.js');
      await downloadCoversFromCloud((curr, total) => {
        console.log(`Check: ${curr}/${total}`);
      });
      showModal('Successo', 'Download copertine completato!', 'info', () => {
        if (onRefresh) onRefresh();
      });
    }
  };


  // Local Backup Handlers
  const handleExportJSON = async () => {
    try {
      const mangaList = await getAllManga();
      const dataStr = JSON.stringify(mangaList, null, 2);
      const fileName = `MangaBox_Backup_${new Date().toISOString().slice(0, 10)}.json`;

      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore generale export JSON:', err);
      showModal('Errore', 'Impossibile creare il backup JSON.');
    }
  };

  const handleExportHTML = async () => {
    try {
      showModal('Info', 'Generazione backup HTML in corso...', 'info');
      const allManga = await getAllManga();
      const libraryList = allManga.filter(m => !m.collection || m.collection === 'library');
      const lettureList = allManga.filter(m => m.collection === 'letture');
      const wishlistList = allManga.filter(m => m.collection === 'wishlist');
      
      const { generateHTML } = await import('../utils/htmlExport.js');
      generateHTML(libraryList, lettureList, wishlistList, settings.theme, settings.nickname);
    } catch (err) {
      console.error('Errore export HTML:', err);
      showModal('Errore', 'Impossibile creare il backup HTML.');
    }
  };

  const handleImportUnified = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.html')) {
      handleImportHTML(e);
    } else if (file.name.toLowerCase().endsWith('.json')) {
      handleImport(e);
    } else {
      showModal('Errore', 'Formato file non supportato. Usa .json o .html');
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          showModal(
            'Importa Backup',
            `Trovati ${importedData.length} manga. Vuoi importarli?`,
            'confirm',
            async () => {
              const { bulkAddManga } = await import('../db.js');
              await bulkAddManga(importedData);
              showModal('Successo', 'Importazione completata!', 'info', () => window.location.reload());
            }
          );
        } else {
          showModal('Errore', 'Formato file non valido.');
        }
      } catch (err) {
        console.error(err);
        showModal('Errore', 'Errore durante la lettura del file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportHTML = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        // Regex to find the embedded data
        const matchData = text.match(/const RAW_DATA = (\[[\s\S]*?\]);/);
        const matchLetture = text.match(/const RAW_LETTURE = (\[[\s\S]*?\]);/);
        const matchWishlist = text.match(/const RAW_WISHLIST = (\[[\s\S]*?\]);/);

        let importedData = [];

        if (matchData && matchData[1]) {
          importedData = importedData.concat(JSON.parse(matchData[1]));
        }
        if (matchLetture && matchLetture[1]) {
          importedData = importedData.concat(JSON.parse(matchLetture[1]));
        }
        if (matchWishlist && matchWishlist[1]) {
          importedData = importedData.concat(JSON.parse(matchWishlist[1]));
        }

        if (importedData.length > 0) {
          showModal(
            'Importa da HTML',
            `Trovati ${importedData.length} manga nel file HTML. Vuoi importarli nel database?`,
            'confirm',
            async () => {
              const { bulkAddManga } = await import('../db.js');
              await bulkAddManga(importedData);
              showModal('Successo', 'Importazione completata!', 'info', () => window.location.reload());
            }
          );
        } else {
          showModal('Errore', 'Impossibile trovare i dati di backup in questo file HTML.');
        }

      } catch (err) {
        console.error(err);
        showModal('Errore', 'Errore durante la lettura del file HTML.');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAll = async () => {
    const mangaList = await getAllManga();
    const count = mangaList.length;

    if (count === 0) {
      showModal('Info', 'Il database è già vuoto!');
      return;
    }

    showModal(
      'ATTENZIONE!',
      `Stai per eliminare TUTTI i ${count} manga dal database.\n\nQuesta azione è IRREVERSIBILE!\n\nVuoi continuare?`,
      'confirm',
      () => {
        showModal(
          'Conferma Definitiva',
          'Sei DAVVERO sicuro? Tutti i dati verranno persi!',
          'confirm',
          async () => {
            await deleteAllManga();
            showModal('Successo', 'Database svuotato con successo!', 'info', () => window.location.reload());
          }
        );
      }
    );
  };

  return html`
    <div class="container" style="padding: 24px; padding-bottom: 100px; max-width: 1200px; margin: 0 auto;">
      <h2 class="view-title" style="margin: 0 0 24px 0;">Impostazioni</h2>

      <!-- 1. PERSONALIZZAZIONE -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--text-color); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 16px;">Personalizzazione</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          
          <div style="background: var(--surface-color); padding: 16px; border-radius: 12px; grid-column: span 2;">
            <div style="font-weight: bold; margin-bottom: 8px;">👤 Nickname</div>
            <input 
              type="text" 
              value=${settings.nickname || ''}
              onInput=${(e) => onSettingsChange({ ...settings, nickname: e.target.value })}
              placeholder="Il tuo nickname..."
              style="width: 100%; padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
            />
          </div>
          
          <div style="background: var(--surface-color); padding: 16px; border-radius: 12px;">
            <div style="font-weight: bold; margin-bottom: 8px;">🎨 Temi</div>
            <div class="custom-select-container">
              <div 
                class="custom-select-trigger" 
                tabIndex="0"
                onClick=${() => setOpenDropdown(openDropdown === 'theme' ? null : 'theme')}
                onKeyDown=${(e) => {
                  const options = getThemeNames();
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const idx = options.indexOf(settings.theme);
                    const next = options[(idx + 1) % options.length];
                    onSettingsChange({ ...settings, theme: next });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const idx = options.indexOf(settings.theme);
                    const next = options[(idx - 1 + options.length) % options.length];
                    onSettingsChange({ ...settings, theme: next });
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenDropdown(openDropdown === 'theme' ? null : 'theme');
                  } else if (e.key === 'Escape') {
                    setOpenDropdown(null);
                  }
                }}
                style="padding: 10px;"
              >
                <span>${settings.theme}</span>
                <svg style="transform: ${openDropdown === 'theme' ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              ${openDropdown === 'theme' && html`
                <div class="custom-select-options">
                  ${getThemeNames().map(themeName => html`
                    <div 
                      class="custom-select-option ${settings.theme === themeName ? 'selected' : ''}"
                      onClick=${() => { onSettingsChange({ ...settings, theme: themeName }); setOpenDropdown(null); }}
                    >
                      ${themeName}
                    </div>
                  `)}
                </div>
              `}
            </div>
          </div>

          <div style="background: var(--surface-color); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: bold; margin-bottom: 8px;">🔢 Griglia</div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
               <span style="font-size: 12px; color: var(--secondary-text-color);">Colonne: ${settings.gridColumns}</span>
               <input 
                type="range" 
                min="${(isMobile() || window.innerWidth < 768) ? 1 : 3}" 
                max="${(isMobile() || window.innerWidth < 768) ? 4 : 8}" 
                value=${settings.gridColumns}
                onInput=${(e) => onSettingsChange({ ...settings, gridColumns: parseInt(e.target.value) })}
                style="width: 60%; cursor: pointer;"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 2. BACKUP & SYNC -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--text-color); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 16px;">
          Backup
          <${HelpTooltip} text="Gestisci i tuoi dati localmente o sincronizzali con il Cloud." />
        </h3>

        <!-- Local Backup Section -->
        <div style="background: var(--surface-color); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border-color);">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                💾 Backup Locale
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                 <button 
                  onClick=${handleExportHTML}
                  style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-family: inherit; font-size: 14px; font-weight: 500; line-height: 1.2; text-align: center;"
                  onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  🌐 Crea backup .html
                </button>
                <button 
                  onClick=${handleExportJSON}
                  style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-family: inherit; font-size: 14px; font-weight: 500; line-height: 1.2; text-align: center;"
                  onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  📄 Crea backup .json
                </button>
                <label 
                  style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-family: inherit; font-size: 14px; font-weight: 500; line-height: 1.2; text-align: center;"
                  onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  📥 Importa backup
                  <input type="file" accept=".json,.html" onChange=${handleImportUnified} style="display: none;" />
                </label>
            </div>
        </div>

        <!-- Google Drive Sync Section -->
        <div style="background: var(--surface-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                ☁️ Google Drive Sync
          </div>
          
          ${!isGoogleConnected ? html`
            <!-- DISCONNECTED STATE -->
            <div style="text-align: center; padding: 20px 0;">
                <p style="color: var(--secondary-text-color); margin-bottom: 24px;">
                    Collega il tuo account Google per sincronizzare i manga tra i tuoi dispositivi.
                </p>
                <button 
                  onClick=${handleGoogleLogin}
                  style="
                    background: #4285F4; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 12px; 
                    font-size: 16px; 
                    font-weight: bold; 
                    cursor: pointer; 
                    display: inline-flex; 
                    align-items: center; 
                    gap: 12px;
                    transition: transform 0.2s;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                  "
                  onMouseEnter=${e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave=${e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
                  Connetti Google Drive
                </button>
            </div>
          ` : html`
            <!-- CONNECTED STATE -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--success-color); font-weight: bold;">
                        <span style="width: 10px; height: 10px; background: currentColor; border-radius: 50%;"></span>
                        Account Collegato
                    </div>
                    <button 
                        onClick=${handleGoogleLogout}
                        style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 6px 12px; border-radius: 12px; cursor: pointer; font-size: 12px;"
                    >
                        Disconnetti
                    </button>
                </div>
                
                <!-- Auto Sync Toggle -->
                <div style="background: var(--background-color); padding: 12px; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border-color);">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                           🔄 Sincronizzazione Automatica
                        </div>
                        <div style="font-size: 11px; color: var(--secondary-text-color);">
                            Carica le modifiche su Drive pochi secondi dopo ogni cambiamento.
                        </div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 40px; height: 24px;">
                        <input 
                            type="checkbox" 
                            checked=${settings.autoSync !== false} 
                            onChange=${(e) => onSettingsChange({ ...settings, autoSync: e.target.checked })}
                            style="opacity: 0; width: 0; height: 0;"
                        />
                        <span style="
                            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
                            background-color: ${settings.autoSync !== false ? 'var(--primary-color)' : '#ccc'}; 
                            transition: .4s; border-radius: 24px;
                        "></span>
                        <span style="
                            position: absolute; content: ''; height: 16px; width: 16px; left: 4px; bottom: 4px; 
                            background-color: white; transition: .4s; border-radius: 50%;
                            transform: ${settings.autoSync !== false ? 'translateX(16px)' : 'translateX(0)'};
                        "></span>
                    </label>
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
                    
                    <!-- DATI MANGA (JSON) -->
                    <div>
                        <h4 style="margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
                            📑 Dati manga
                            <span style="font-size: 11px; background: var(--primary-color); color: #000; padding: 2px 6px; border-radius: 4px;">Veloce</span>
                        </h4>
                        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
                            Sincronizza titoli, volumi, stati di lettura. File leggero.
                        </p>
                        <div style="display: flex; gap: 12px;">
                            <button onClick=${() => handleSyncText('push')} style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                                ⬆️ Backup dati su drive
                            </button>
                            <button onClick=${() => handleSyncText('pull')} style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                                ⬇️ Download dati da Drive
                            </button>
                        </div>
                    </div>

                    <div style="height: 1px; background: var(--border-color);"></div>

                    <!-- IMMAGINI (COVERS) -->
                    <div>
                        <h4 style="margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
                            🖼️ Copertine
                            <span style="font-size: 11px; background: var(--warning-color); color: #000; padding: 2px 6px; border-radius: 4px;">Lento</span>
                        </h4>
                        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
                            Sincronizza le immagini. Richiede più tempo e connessione.
                        </p>
                        <div style="display: flex; gap: 12px;">
                            <button onClick=${() => handleSyncCovers('upload')} style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                                ⬆️ Backup copertine su drive
                            </button>
                            <button onClick=${() => handleSyncCovers('download')} style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                                ⬇️ Download copertine da Drive
                            </button>
                        </div>
                    </div>

                </div>
            </div>
          `}
        </div>
      </div>

      <!-- 4. AVANZATE -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--text-color); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 16px;">Strumenti Avanzati</h3>
        <div style="background: var(--surface-color); padding: 16px; border-radius: 12px;">
           
           <!-- Gemini & History -->
           <div style="margin-bottom: 24px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Gemini API Key & Storico</div>
              
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <!-- API Key Input -->
                  <div style="flex: 1;">
                      <div style="position: relative;">
                        <input 
                            type=${showGeminiKey ? 'text' : 'password'} 
                            value=${settings.geminiApiKey || ''}
                            onInput=${(e) => onSettingsChange({ ...settings, geminiApiKey: e.target.value })}
                            placeholder="Key..."
                            style="width: 100%; padding: 10px; padding-right: 40px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
                        />
                        <button 
                            onClick=${() => setShowGeminiKey(!showGeminiKey)}
                            style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--secondary-text-color); cursor: pointer; padding: 4px;"
                        >
                            ${showGeminiKey ?
      html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` :
      html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
    }
                        </button>
                      </div>
                      <p style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">Per abilitare la funzione Auto-fill. Inserisci un titolo e l'IA cercherà di completare i campi rimanenti.</p>
                  </div>
                  
                    <button 
                        onClick=${onOpenHistory}
                        title="Vedi Storico Modifiche"
                        style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-family: inherit; font-size: 14px; font-weight: 500;"
                        onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        🕰️ Storico
                  </button>
              </div>
            </div>

            <div style="height: 1px; background: var(--border-color); margin-bottom: 24px;"></div>

            <div style="display: flex; gap: 12px;">
               <button 
                onClick=${async () => {
      showModal('Conferma', 'Vuoi assegnare la data di OGGI (come data di aggiunta alla libreria) a tutti i manga senza data?', 'confirm', async () => {
        const { backfillDates } = await import('../db.js');
        const count = await backfillDates();
        showModal('Successo', `Aggiornati ${count} manga!`, 'info', () => window.location.reload());
      });
    }}
                style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;"
                onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                📅 Imposta ad oggi le date mancanti
                </button>

                <button 
                onClick=${handleDeleteAll}
                style="flex: 1; padding: 12px; background: rgba(255, 82, 82, 0.1); color: #ff5252; border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;"
                onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255, 82, 82, 0.18)'}
                onMouseLeave=${e => e.currentTarget.style.background = 'rgba(255, 82, 82, 0.1)'}
                >
                ⚠️ Elimina tutto
                </button>
            </div>
        </div>
      </div>

      <!-- INFO APP -->
      <div style="text-align: center; margin-top: 48px; color: var(--secondary-text-color); font-size: 12px;">
        <div>Manga Box v1.5</div>
        <div style="margin-top: 8px;">
            <span onClick=${() => setShowChangelog(true)} style="cursor: pointer; text-decoration: underline;">Changelog</span>
        </div>
      </div>

      <${Modal} 
        isOpen=${modalState.isOpen} 
        title=${modalState.title} 
        message=${modalState.message} 
        type=${modalState.type} 
        onConfirm=${modalState.onConfirm} 
        onCancel=${modalState.onCancel} 
      />
      
      ${showChangelog && html`
        <div 
          class="animate-fade-in"
          style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
          onClick=${() => setShowChangelog(false)}
        >
          <div 
            class="flex-col animate-slide-up" 
            style="background: var(--surface-color); width: 100%; max-width: 600px; max-height: 85vh; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid var(--border-color); position: relative;"
            onClick=${(e) => e.stopPropagation()}
          >
            <!-- Header -->
            <div style="padding: 48px 24px 24px 24px; display: flex; gap: 24px; align-items: center; border-bottom: 1px solid var(--border-color);">
               <!-- Icon Placeholder -->
               <div style="width: 120px; height: 120px; flex-shrink: 0; border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2); color: var(--primary-color);">
                  <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
                    <!-- Top Face -->
                    <path d="M 10 25 L 50 5 L 90 25 L 50 45 Z" style="fill: color-mix(in srgb, currentColor, black 40%);" />
                    <!-- Left Face -->
                    <path d="M 10 25 L 50 45 L 50 95 L 10 75 Z" style="fill: currentColor;" />
                    <!-- Right Face -->
                    <path d="M 50 45 L 90 25 L 90 75 L 50 95 Z" style="fill: color-mix(in srgb, currentColor, black 30%);" />
                    <!-- Side Details -->
                    <path d="M 20 50 L 40 60 L 40 56 L 20 46 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                    <path d="M 20 65 L 40 75 L 40 71 L 20 61 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                    <!-- Speech Bubble -->
                    <path d="M 58 55 L 82 43 L 82 58 L 76 61 L 72 68 L 68 65 L 58 70 Z" fill="#ffffff" />
                    <!-- Bubble Dots -->
                    <circle cx="65" cy="60" r="2" fill="currentColor" />
                    <circle cx="70" cy="57.5" r="2" fill="currentColor" />
                    <circle cx="75" cy="55" r="2" fill="currentColor" />
                  </svg>
               </div>
               <div class="flex-col">
                  <div style="font-size: 28px; font-weight: bold; color: var(--text-color); line-height: 1; letter-spacing: -0.5px;">Manga<span style="font-weight: 300;">Box</span></div>
                  <div style="font-size: 16px; color: var(--primary-color); font-weight: 600; margin-top: 6px;">v1.5 Stable</div>
                  <div style="font-size: 13px; color: var(--secondary-text-color); margin-top: 8px; opacity: 0.8;">Registro delle modifiche e novità</div>
               </div>

            </div>

            <!-- Close Button -->
            <div style="position: absolute; top: 16px; right: 16px;">
                 <button 
                  onClick=${() => setShowChangelog(false)}
                  style="background: none; border: none; color: var(--text-color); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" 
                  onMouseEnter=${e => e.target.style.background = 'var(--hover-bg-color)'} 
                  onMouseLeave=${e => e.target.style.background = 'transparent'} 
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
            </div>

            <!-- Content Area -->
            <div style="overflow-y: auto; flex: 1; padding: 24px; background: rgba(0,0,0,0.1);">
                <div style="white-space: pre-line; color: var(--text-color); font-size: 14px; line-height: 1.7; font-family: 'Inter', system-ui, sans-serif;">
                  ${`v1.5 (13/04/2026)

Nuova Tab "Letture": sezione dedicata ai fumetti letti ma non posseduti (come volumi venduti o scan). Queste letture vengono conteggiate nelle statistiche generali senza però influenzare il numero totale di volumi o il valore economico della collezione.

Grafici: risolti i problemi di alcuni grafici che non mostravano tutti i valori ed eliminati i dati ridondanti nei report.

Introdotte nuove icone e una maggiore uniformità visiva.

Nuovi menu a comparsa personalizzati e descrizioni dei pulsanti più chiare per i nuovi utenti.

Autocompletamento: sistema di suggerimento automatico per i campi Autore ed Editore per velocizzare l'inserimento manuale.

Bug Fix: risolto il problema del login forzato a Google Drive ad ogni modifica e corretti i bug relativi allo storico (log).

v1.4 (21/01/2026)

Timeline & Log: aggiunta la cronologia delle modifiche per monitorare ogni cambiamento nel database.

Export potenziato: migliorata l'esportazione dei dati con file più leggeri e nuovi filtri di selezione.

Fix Statistiche: corretta la gestione dei grafici e dei filtri temporali per un’analisi più precisa.

Miglioramenti generali alle prestazioni e alla velocità di risposta.

v1.3 (16/01/2026)

Implementata la sincronizzazione cloud di dati e copertine.

v1.2 (14/12/2025)

Aggiornamento dell'interfaccia grafica.

Introdotta la barra di navigazione inferiore per una migliore ergonomia su schermi piccoli.

v1.1 (05/12/2025)

Migliorata la resa grafica delle modalità griglia e lista.

Corretto il sistema di sorting dei volumi e risolti bug minori segnalati dagli utenti.

v1.0 (01/12/2025)

Rilascio Iniziale.
`}
                </div>
            </div>
          </div>
        </div>
      `}

    </div>
  `;
}
