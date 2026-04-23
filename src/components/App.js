import { h } from 'preact';
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import { html } from 'htm/preact';
import { getAllManga, addManga, updateManga, deleteManga, upsertMangaLocal, deleteMangaLocal } from '../db.js';
import { getSettings, saveSettings, applyTheme } from '../settings.js';


import MangaForm from './MangaForm.js';
import MangaDetails from './MangaDetails.js';
import Statistics from './Statistics.js';
import HistoryLog from './HistoryLog.js';

import Info from './Info.js';
import BottomNav from './BottomNav.js';


// Helper components
const LinearProgress = ({ percentage }) => {
  return html`
    <div class="linear-progress">
      <div class="linear-progress-fill" style="width: ${percentage}%"></div>
    </div>
  `;
};

// Navigation Components
const TopTabBar = ({ activeTab, setActiveTab }) => {
  const tabs = [

    { id: 'library', label: 'Libreria' },
    { id: 'letture', label: 'Letture' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'updates', label: 'Stats' },
    { id: 'info', label: 'Impostazioni' }
  ];

  return html`
    <div class="top-tabs">
      ${tabs.map(tab => html`
        <div 
          class="tab-item ${activeTab === tab.id ? 'active' : ''}" 
          onClick=${() => setActiveTab(tab.id)}
        >
          ${tab.label}
        </div>
      `)}
    </div>
  `;
};

// Components
const LibraryGrid = ({ mangaList, onMangaClick, viewMode, gridColumns = 5 }) => {
  const emptyFace = useMemo(() => {
    const faces = ['(┬﹏┬)', 'ಥ_ಥ', '(>_<)'];
    return faces[Math.floor(Math.random() * faces.length)];
  }, [mangaList.length === 0]);

  if (mangaList.length === 0) {
    return html`
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 250px); color: var(--secondary-text-color); gap: 16px;">
        <div style="font-size: 64px; font-weight: 300;">${emptyFace}</div>
        <div style="font-size: 16px;">Nessun risultato trovato</div>
      </div>
    `;
  }

  const getReadingProgress = (manga) => {
    if (!manga.volumes || !Array.isArray(manga.volumes) || manga.volumes.length === 0) return 0;
    const readCount = manga.volumes.filter(v => v.read).length;
    return Math.round((readCount / manga.volumes.length) * 100);
  };

  const getTotalCost = (manga) => {
    if (!manga.volumes || !Array.isArray(manga.volumes)) return '0.00';
    return manga.volumes.reduce((total, vol) => {
      const price = parseFloat(vol.price);
      return total + (isNaN(price) ? 0 : price);
    }, 0).toFixed(2);
  };

  if (viewMode === 'list') {
    return html`
      <div class="library-list" style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
        ${mangaList.map((manga, index) => {
      const progress = getReadingProgress(manga);
      const totalCost = getTotalCost(manga);
      const volumeCount = manga.volumes ? manga.volumes.length : 0;

      return html`
            <div 
              class="manga-list-item animate-slide-up"
              style="animation-delay: ${index * 0.05}s; display: flex; gap: 16px; padding: 16px; background: var(--surface-color); border-radius: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); align-items: center;"
              onClick=${() => onMangaClick(manga)}
              onMouseEnter=${e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave=${e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--surface-color)'; }}
            >
              <img 
                src="${manga.coverUrl || 'https://placehold.co/200x300/333/666?text=No+Cover'}" 
                style="width: 50px; height: 75px; object-fit: cover; border-radius: 12px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);" 
                alt="${manga.title}" 
              />
              
              <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <div style="font-weight: bold; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 8px;">${manga.title}</div>
                  <div class="desktop-only" style="font-size: 11px; border: 1px solid var(--primary-color); color: var(--primary-color); padding: 6px 16px; border-radius: 12px; font-weight: 700; letter-spacing: 0.5px; background: transparent; white-space: nowrap; text-transform: uppercase;">${manga.status || 'N/A'}</div>
                </div>
                
                <div style="font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                  <span class="mobile-only" style="width: 8px; height: 8px; border-radius: 50%; background: ${manga.status === 'Serie completa' ? '#9ECE6A' : (manga.status === 'Serie in corso' ? '#7DCFFF' : (manga.status === 'Volume unico' ? '#E0AF68' : 'transparent'))}; display: ${manga.status ? 'inline-block' : 'none'}; flex-shrink: 0;"></span>
                  <span>${manga.author || '-'} • ${manga.publisher || '-'} • ${manga.target || '-'}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <div style="font-size: 12px;">
                    <span style="font-weight: 600;">${volumeCount} volumi</span> 
                    ${manga.collection !== 'letture' ? html`• <span style="color: var(--primary-color); white-space: nowrap;">€${"\u00A0"}${totalCost}</span>` : ''}
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; width: 150px;">
                    <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                      <div style="width: ${progress}%; height: 100%; background: var(--primary-color); border-radius: 2px;"></div>
                    </div>
                    <span style="font-size: 11px; color: var(--secondary-text-color); width: 30px; text-align: right;">${progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          `;
    })}
      </div>
    `;
  }

  if (viewMode === 'table') {
    return html`
      <div style="overflow-x: auto; padding: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 600px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Cover</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Titolo</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Autore</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Editore</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Target</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Stato</th>
              <th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Volumi</th>
              ${mangaList.some(m => m.collection !== 'letture') ? html`<th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--surface-color); color: var(--secondary-text-color);">Prezzo Tot.</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${mangaList.map(manga => {
      const totalCost = getTotalCost(manga);
      const volumeCount = manga.volumes ? manga.volumes.length : 0;
      return html`
                <tr 
                  onClick=${() => onMangaClick(manga)}
                  style="cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;"
                  onMouseEnter=${e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave=${e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style="padding: 8px 12px;">
                    <img src="${manga.coverUrl || 'https://placehold.co/200x300/333/666?text=No+Cover'}" style="width: 30px; height: 45px; border-radius: 2px; object-fit: cover;" />
                  </td>
                  <td style="padding: 12px; font-weight: bold;">${manga.title}</td>
                  <td style="padding: 12px;">${manga.author || '-'}</td>
                  <td style="padding: 12px;">${manga.publisher || '-'}</td>
                  <td style="padding: 12px;">${manga.target || '-'}</td>
                  <td style="padding: 12px;">
                    <span style="
                      font-size: 13px; 
                      font-weight: 500; 
                      color: ${manga.status === 'Serie completa' ? '#9ECE6A' : (manga.status === 'Serie in corso' ? '#7DCFFF' : (manga.status === 'Volume unico' ? '#E0AF68' : 'var(--text-color)'))};
                    ">
                      ${manga.status || 'N/A'}
                    </span>
                  </td>
                  <td style="padding: 12px;">${volumeCount}</td>
                  ${manga.collection !== 'letture' ? html`<td style="padding: 12px;">€ ${totalCost}</td>` : ''}
                </tr>
              `;
    })}
          </tbody>
        </table>
      </div>
    `;
  }



  // On mobile (<600px), let CSS handle columns. On desktop, use the setting.
  const isMobileScreen = window.innerWidth < 600;
  const gridStyle = isMobileScreen ? '' : `grid-template-columns: repeat(${gridColumns}, 1fr);`;

  return html`
    <div class="library-grid" style="${gridStyle}">
      ${mangaList.map((manga, index) => {
    const progress = getReadingProgress(manga);
    return html`
          <div 
            class="manga-card" 
            style="animation-delay: ${index * 0.03}s;"
            onClick=${() => onMangaClick(manga)}
          >
            <div class="manga-cover-container">
              <img src="${manga.coverUrl || 'https://placehold.co/200x300/333/666?text=No+Cover'}" class="manga-cover" alt="${manga.title}" />
            </div>
            <${LinearProgress} percentage=${progress} />
            <div class="manga-title" style="margin-top: 6px;">${manga.title}</div>
            <div style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">
              ${manga.volumes ? manga.volumes.length : 0} vol • ${progress}%
            </div>
          </div>
        `;
  })}
    </div>
  `;
};

const FilterPanel = ({ filters, setFilters, sortOrder, setSortOrder, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 280); // Match animation duration
  };

  const statusOptions = ['Serie in corso', 'Serie completa', 'Volume unico'];
  const targetOptions = ['Shonen', 'Seinen', 'Shojo', 'Josei'];
  const sortOptions = [
    { value: 'title_asc', label: 'A-Z', icon: '↑' },
    { value: 'title_desc', label: 'Z-A', icon: '↓' },
    { value: 'volumes_desc', label: 'Più Vol', icon: '📚' },
    { value: 'volumes_asc', label: 'Meno Vol', icon: '📖' }
  ];

  return html`
      <div 
      class="${isClosing ? 'animate-fade-out' : 'animate-fade-in'}"
      style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1500; display: flex; justify-content: flex-end; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
      onClick=${(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div 
        onClick=${(e) => e.stopPropagation()}
        class="${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}"
        style="width: 100%; max-width: 360px; background: var(--surface-color); height: 100%; position: relative; padding: 24px; padding-top: 60px; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 24px; box-shadow: -4px 0 20px rgba(0,0,0,0.3);"
      >
          <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Filtri</div>
          <button onClick=${handleClose} class="icon-button" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05);">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 96 960 960" width="20" fill="currentColor"><path d="m256 756-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
          </button>
        </div>
        
        <div class="flex-col" style="gap: 12px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--primary-color); text-transform: uppercase; letter-spacing: 1px;">Ordina</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${sortOptions.map(option => html`
              <button
                onClick=${() => setSortOrder(option.value)}
                style="
                  padding: 12px;
                  background: ${sortOrder === option.value ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)'};
                  color: ${sortOrder === option.value ? '#000' : 'var(--text-color)'};
                  border: 1px solid ${sortOrder === option.value ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'};
                  border-radius: 12px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                "
              >
                <span>${option.label}</span>
              </button>
            `)}
          </div>
        </div>

        <div style="height: 1px; background: rgba(255,255,255,0.05);"></div>

        <div class="flex-col" style="gap: 12px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--primary-color); text-transform: uppercase; letter-spacing: 1px;">Stato</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${statusOptions.map(status => html`
              <button
                onClick=${() => setFilters({ ...filters, status: filters.status === status ? '' : status })}
                style="
                  padding: 12px;
                  background: ${filters.status === status ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)'};
                  color: ${filters.status === status ? '#000' : 'var(--text-color)'};
                  border: 1px solid ${filters.status === status ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'};
                  border-radius: 12px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 600;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  text-align: left;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  
                "
              >
                <span>${status}</span>
                ${filters.status === status ? html`<span style="font-weight: bold;">✓</span>` : null}
              </button>
            `)}
          </div>
        </div>

        <div style="height: 1px; background: rgba(255,255,255,0.05);"></div>

        <div class="flex-col" style="gap: 12px;">
          <label style="font-size: 14px; font-weight: 600; color: var(--primary-color); text-transform: uppercase; letter-spacing: 1px;">Target</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${targetOptions.map(target => html`
              <button
                onClick=${() => setFilters({ ...filters, target: filters.target === target ? '' : target })}
                style="
                  padding: 12px;
                  background: ${filters.target === target ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)'};
                  color: ${filters.target === target ? '#000' : 'var(--text-color)'};
                  border: 1px solid ${filters.target === target ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'};
                  border-radius: 12px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 600;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                "
              >
                ${target}
              </button>
            `)}
          </div>
        </div>

        <div style="margin-top: auto;">
          <button 
            onClick=${() => { setFilters({ status: '', target: '' }); setSortOrder('title_asc'); }}
            style="width: 100%; padding: 14px; background: rgba(0,0,0,0.05); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s;"
          >
            Reset Filtri
          </button>
        </div>
      </div>
    </div>
  `;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [view, setView] = useState('main');
  const [mangaList, setMangaList] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);
  const [settings, setSettings] = useState({});
  const [viewMode, setViewMode] = useState(() => getSettings().viewMode || 'grid');
  const [gridColumns, setGridColumns] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', target: '' });
  const [sortOrder, setSortOrder] = useState('title_asc');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputRef = useRef(null);
  const mainContentRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Restore scroll position when returning to main view or opening details
  useLayoutEffect(() => {
    if ((view === 'main' || view === 'details') && mainContentRef.current) {
      mainContentRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [view]);


  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    setGridColumns(loadedSettings.gridColumns);
    applyTheme(loadedSettings.theme);
  }, []);

  useEffect(() => {
    loadLibrary();
  }, []);

  // History API: handle browser back button / gesture
  useEffect(() => {
    const handlePopState = (e) => {
      const state = e.state;

      // If filters are open, close them on back gesture
      if (showFilters) {
        setShowFilters(false);
        return;
      }

      if (state && state.view) {
        setView(state.view);
        if (state.view === 'main') {
          setSelectedManga(null);
        }
      } else {
        // No state = initial page, go to main
        if (view !== 'main') {
          setView('main');
          setSelectedManga(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, showFilters]);

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
    if (newSettings.gridColumns !== undefined) {
      setGridColumns(newSettings.gridColumns);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        if (showFilters) { setShowFilters(false); if (history.state && history.state.view === 'filters') history.back(); }
        else if (view !== 'main') {
          setView('main');
          setSelectedManga(null);
        }
        return;
      }

      if (e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setActiveTab('library'); setView('main'); break;
          case '2': e.preventDefault(); setActiveTab('letture'); setView('main'); break;
          case '3': e.preventDefault(); setActiveTab('wishlist'); setView('main'); break;
          case '4': e.preventDefault(); setActiveTab('updates'); setView('main'); break;
          case '5': e.preventDefault(); setActiveTab('info'); setView('main'); break;
          case 'n': case 'N': e.preventDefault(); setView('create'); break;
          case 'm': case 'M': {
            e.preventDefault();
            const modes = ['grid', 'list', 'table'];
            const nextMode = modes[(modes.indexOf(viewMode) + 1) % modes.length];
            setViewMode(nextMode);
            updateSettings({ ...settings, viewMode: nextMode });
            break;
          }
          case 'l': case 'L': {
            e.preventDefault();
            if (activeTab !== 'library' && activeTab !== 'wishlist') {
              setActiveTab('library');
            }
            // Small timeout to allow render if tab changed
            setTimeout(() => searchInputRef.current?.focus(), 50);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showFilters, viewMode, activeTab, settings]);

  const loadLibrary = async () => {
    const list = await getAllManga();
    setMangaList(list);
  };

  const handleSaveManga = async (formData) => {
    if (selectedManga) {
      // Safeguard: Ensure ID is preserved to prevent duplication
      const mangaToUpdate = { ...formData, id: selectedManga.id };
      await updateManga(mangaToUpdate);
      setSelectedManga(mangaToUpdate);
      setView('details');
    } else {
      await addManga(formData);
      setView('main');
    }
    await loadLibrary();
  };

  const handleUpdateManga = async (updatedManga) => {
    // Safeguard: Ensure ID is preserved
    const mangaToUpdate = selectedManga ? { ...updatedManga, id: selectedManga.id } : updatedManga;
    await updateManga(mangaToUpdate);
    setSelectedManga(mangaToUpdate);
    loadLibrary();
  };

  const handleCancel = () => {
    if (selectedManga && view === 'edit') {
      setView('details');
      // Don't push state - we're going back
    } else {
      setView('main');
      setSelectedManga(null);
    }
    // Use history.back() only if we pushed a state for this view
    if (history.state && history.state.view) {
      history.back();
    }
  };

  const handleMangaClick = (manga) => {
    if (mainContentRef.current) {
      scrollPositionRef.current = mainContentRef.current.scrollTop;
    }
    setSelectedManga(manga);
    setView('details');
    // Push history state so back gesture returns to list
    history.pushState({ view: 'details' }, '');
  };

  const libraryList = useMemo(() => mangaList.filter(m => !m.collection || m.collection === 'library'), [mangaList]);
  const lettureList = useMemo(() => mangaList.filter(m => m.collection === 'letture'), [mangaList]);
  const wishlistList = useMemo(() => mangaList.filter(m => m.collection === 'wishlist'), [mangaList]);

  const filteredMangaList = useMemo(() => {
    // Determine which list to filter based on active tab
    const sourceList = activeTab === 'wishlist' ? wishlistList : activeTab === 'letture' ? lettureList : libraryList;
    let result = [...sourceList];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.author && m.author.toLowerCase().includes(q))
      );
    }
    if (filters.status) result = result.filter(m => m.status === filters.status);
    if (filters.target) result = result.filter(m => m.target === filters.target);

    result.sort((a, b) => {
      switch (sortOrder) {
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        case 'volumes_desc': return (b.volumes?.length || 0) - (a.volumes?.length || 0);
        case 'volumes_asc': return (a.volumes?.length || 0) - (b.volumes?.length || 0);
        default: return 0;
      }
    });
    return result;
  }, [mangaList, searchQuery, filters, sortOrder, activeTab]);

  const handleDeleteManga = async (id) => {
    await deleteManga(id);
    setView('main');
    setSelectedManga(null);
    await loadLibrary();
  };

  const renderContent = () => {
    let content = null;
    switch (activeTab) {
      case 'library':
        content = html`
      <div class="container" style="padding: 24px 0 0; max-width: 1200px; margin: 0 auto;">
        <h2 class="view-title">${settings.nickname ? `Libreria di ${settings.nickname}` : 'Libreria'} (${filteredMangaList.length})</h2>
        <${LibraryGrid} mangaList=${filteredMangaList} onMangaClick=${handleMangaClick} viewMode=${viewMode} gridColumns=${gridColumns} />
      </div>
      `;
        break;
      case 'wishlist':
        content = html`
      <div class="container" style="padding: 24px 0 0; max-width: 1200px; margin: 0 auto;">
        <h2 class="view-title">${settings.nickname ? `Wishlist di ${settings.nickname}` : 'Wishlist'} (${filteredMangaList.length})</h2>
        <${LibraryGrid} mangaList=${filteredMangaList} onMangaClick=${handleMangaClick} viewMode=${viewMode} gridColumns=${gridColumns} />
      </div>
      `;
        break;
      case 'letture':
        content = html`
      <div class="container" style="padding: 24px 0 0; max-width: 1200px; margin: 0 auto;">
        <h2 class="view-title">${settings.nickname ? `Letture di ${settings.nickname}` : 'Solo Lettura'} (${filteredMangaList.length})</h2>
        <${LibraryGrid} mangaList=${filteredMangaList} onMangaClick=${handleMangaClick} viewMode=${viewMode} gridColumns=${gridColumns} />
      </div>
      `;
        break;
      case 'updates':
        content = html`<${Statistics} mangaList=${libraryList} lettureList=${lettureList} settings=${settings} />`;
        break;
      case 'info':
        content = html`<${Info} onRefresh=${loadLibrary} settings=${settings} onSettingsChange=${updateSettings} onOpenHistory=${() => { setView('history'); history.pushState({ view: 'history' }, ''); }} />`;
        break;
      default:
        content = html`<div class="container">Libreria</div>`;
    }

    return content;
  };

  const renderMangaForm = () => {
    if (view !== 'create' && view !== 'edit') return null;
    return html`
      <${MangaForm} 
        manga=${selectedManga || null} 
        onSave=${handleSaveManga} 
        onCancel=${handleCancel} 
        onDelete=${handleDeleteManga}
        initialCollection=${activeTab === 'wishlist' ? 'wishlist' : activeTab === 'letture' ? 'letture' : 'library'}
        allManga=${mangaList}
      />
    `;
  };

  const renderMangaDetails = () => {
    if (view !== 'details' || !selectedManga) return null;
    return html`
      <${MangaDetails} 
        manga=${selectedManga || null} 
        onEdit=${() => { setView('edit'); history.pushState({ view: 'edit' }, ''); }} 
        onBack=${() => { setView('main'); setSelectedManga(null); if (history.state && history.state.view) history.back(); }}
        onUpdate=${handleUpdateManga}
      />
    `;
  };

  const renderHistory = () => {
    if (view !== 'history') return null;
    return html`
      <${HistoryLog} 
        onBack=${() => setView('main')} 
      />
    `;
  };

  const renderFilterPanel = () => {
    if (!showFilters) return null;
    return html`
      <${FilterPanel} 
        filters=${filters} 
        setFilters=${setFilters} 
        sortOrder=${sortOrder} 
        setSortOrder=${setSortOrder} 
        onClose=${() => { setShowFilters(false); if (history.state && history.state.view === 'filters') history.back(); }} 
      />
    `;
  };

  const getTitle = () => {
    if (view === 'create') return 'Aggiungi Manga';
    if (view === 'edit') return 'Modifica Manga';
    if (view === 'details') return 'Dettagli Manga';
    if (view === 'history') return 'Storico Modifiche';
    if (activeTab === 'library') return 'Libreria';
    if (activeTab === 'letture') return 'Letture';
    if (activeTab === 'updates') return 'Statistiche';
    if (activeTab === 'wishlist') return 'Wishlist';
    if (activeTab === 'info') return 'Impostazioni';
    return 'MangaDB';
  };

  const navItems = [
    {
      id: 'library',
      label: 'Libreria',
      icon: html`<g class="book-left"><rect x="4.5" y="3" width="6.5" height="18" rx="1.5" /><path d="M4.5 7h6.5" opacity="0.4" /></g><g class="book-right"><rect x="13" y="3" width="6.5" height="18" rx="1.5" /><path d="M13 7h6.5" opacity="0.4" /></g>`
    },
    { id: 'letture', label: 'Letture', icon: html`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />` },
    { id: 'wishlist', label: 'Wishlist', icon: html`<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />` },
    { id: 'updates', label: 'Stats', icon: html`<rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="9" width="4" height="12" rx="1" /><rect x="17" y="5" width="4" height="16" rx="1" />` },
    { id: 'info', label: 'Impostazioni', icon: html`<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />` }
  ];

  return html`
      <div class="flex-col" style="height: 100%; flex: 1; overflow: hidden;">
        <!-- App Bar -->
        <div class="app-bar">
          ${view === 'details' || view === 'history' ? html`
          <button onClick=${() => { setView('main'); setSelectedManga(null); if (history.state && history.state.view) history.back(); }} class="icon-button" style="margin-right: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div style="flex: 1; font-weight: bold; font-size: 18px;">${getTitle()}</div>
        ` : html`
          <!-- Responsive Header Layout -->
          <div class="header-content">
            <div class="logo-container" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.5px; background: linear-gradient(135deg, var(--primary-color) 0%, #9D7CFF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: flex; align-items: center; gap: 8px;">
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
                <!-- NEW Top Face (Deep Dark 40% mix) -->
                <path d="M 10 25 L 50 5 L 90 25 L 50 45 Z" style="fill: color-mix(in srgb, currentColor, black 40%);" />
              
                <!-- Left Face (Base Color) -->
                <path d="M 10 25 L 50 45 L 50 95 L 10 75 Z" style="fill: currentColor;" />
                
                <!-- Right Face (Shaded 30% Black mix) -->
                <path d="M 50 45 L 90 25 L 90 75 L 50 95 Z" style="fill: color-mix(in srgb, currentColor, black 30%);" />
                 
                <!-- Side Details (Dark Accents 50% mix) -->
                <path d="M 20 50 L 40 60 L 40 56 L 20 46 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                <path d="M 20 65 L 40 75 L 40 71 L 20 61 Z" style="fill: color-mix(in srgb, currentColor, black 50%);" />
                
                <!-- Speech Bubble (Solid White) -->
                <path d="M 58 55 L 82 43 L 82 58 L 76 61 L 72 68 L 68 65 L 58 70 Z" fill="#ffffff" />
                
                <!-- Bubble Dots -->
                <circle cx="65" cy="60" r="2" fill="currentColor" />
                <circle cx="70" cy="57.5" r="2" fill="currentColor" />
                <circle cx="75" cy="55" r="2" fill="currentColor" />
              </svg>
              <span>Manga<span style="font-weight: 300;">Box</span></span>
              

            </div>

            <div class="nav-center desktop-only">
              ${navItems.map(item => {
    // Determine animation class based on tab type
    let animationClass = '';
    const justBecameActive = activeTab === item.id;

    if (justBecameActive) {
      if (item.id === 'library') animationClass = ' icon-library-tilt';
      else if (item.id === 'letture') animationClass = ' icon-slide-up';
      else if (item.id === 'wishlist') animationClass = ' icon-heartbeat';
      else if (item.id === 'updates') animationClass = ' icon-grow-bars';
      else if (item.id === 'info') animationClass = ' icon-rotate-gear';
    }

    return html`
                  <div 
                    class="nav-link-item ${activeTab === item.id ? 'active' : ''}" 
                    onClick=${() => setActiveTab(item.id)}
                    style="color: ${activeTab === item.id ? 'var(--primary-color)' : 'var(--text-color)'};"
                  >
                    ${activeTab === item.id ? html`<div class="nav-active-bg"></div>` : null}
                    <svg 
                      class="${animationClass} ${activeTab === item.id ? 'active' : ''}" 
                      style="width: 20px; height: 20px;" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"
                    >
                      ${activeTab === item.id ? (item.iconOpen || item.icon) : (item.iconClosed || item.icon)}
                    </svg>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</span>
                  </div>
                `;
  })}
            </div>

            <div class="right-actions ${isSearchFocused ? 'search-active' : ''}" style="margin-left: auto; display: flex; align-items: center; gap: 8px; z-index: 2;">
              ${(activeTab === 'library' || activeTab === 'wishlist' || activeTab === 'letture') ? html`
                <div class="search-container" onClick=${() => searchInputRef.current?.focus()}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input 
                    type="text" 
                    placeholder="Cerca..." 
                    value=${searchQuery}
                    onInput=${(e) => setSearchQuery(e.target.value)}
                    onFocus=${() => setIsSearchFocused(true)}
                    onBlur=${() => setIsSearchFocused(false)}
                    class="search-input"
                    autocomplete="off"
                    ref=${searchInputRef}
                  />
                </div>
                <div style="position: relative; display: inline-block;">
                  <button 
                    onClick=${() => {
          const modes = ['grid', 'list', 'table'];
          const nextMode = modes[(modes.indexOf(viewMode) + 1) % modes.length];
          setViewMode(nextMode);
          updateSettings({ ...settings, viewMode: nextMode });
        }} 
                    class="icon-button"
                    title="Cambia vista"
                  >
                    ${viewMode === 'grid' ? html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>` : ''}
                    ${viewMode === 'list' ? html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" /></svg>` : ''}
                    ${viewMode === 'table' ? html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="10" y1="10" x2="10" y2="20" /></svg>` : ''}
                  </button>
                </div>
                <button onClick=${() => { setShowFilters(true); history.pushState({ view: 'filters' }, ''); }} class="icon-button">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                </button>
              ` : ''}
            </div>
          </div>
        `}
        </div>

        <div class="mobile-only" style="display: ${view === 'main' ? 'block' : 'none'}">
          <${TopTabBar} activeTab=${activeTab} setActiveTab=${setActiveTab} />
        </div>


        <div
          ref=${mainContentRef}
          class="main-content"
          style="flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;"
        >
          ${renderContent()}
        </div>

        
        ${renderMangaForm()}
        ${renderMangaDetails()}
        ${renderHistory()}
        ${renderFilterPanel()}


        ${(activeTab === 'library' || activeTab === 'wishlist') && view === 'main' ? html`
        <button class="fab" onClick=${() => { setView('create'); history.pushState({ view: 'create' }, ''); }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24" fill="currentColor">
            <path d="M440 856V616H200v-80h240V296h80v240h240v80H520v240h-80z"/>
          </svg>
        </button>
      ` : ''}
        <!-- Mobile Bottom Navigation -->
        <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
      </div >
      `;
}
