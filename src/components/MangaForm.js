import { h } from 'preact';
import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { fetchMangaDetails } from '../services/gemini.js';

export default function MangaForm({ manga, onSave, onCancel, onDelete, initialCollection = 'library', allManga = [] }) {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publisherSuggestions, setPublisherSuggestions] = useState([]);
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showPublisherSuggestions, setShowPublisherSuggestions] = useState(false);
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const publisherRef = useRef(null);
  const authorRef = useRef(null);
  const [formData, setFormData] = useState(manga || {
    title: '',
    coverUrl: '',
    author: '',
    publisher: '',
    description: '',
    status: 'Serie in corso',
    target: 'Shonen',
    volumes: [],
    collection: initialCollection,
    dateAdded: manga?.dateAdded || new Date().toISOString()
  });

  // Extract unique publishers and authors from the full manga list
  const uniquePublishers = useMemo(() => {
    const pubs = new Set();
    allManga.forEach(m => { if (m.publisher) pubs.add(m.publisher); });
    return [...pubs].sort((a, b) => a.localeCompare(b));
  }, [allManga]);

  const uniqueAuthors = useMemo(() => {
    const auths = new Set();
    allManga.forEach(m => { if (m.author) auths.add(m.author); });
    return [...auths].sort((a, b) => a.localeCompare(b));
  }, [allManga]);

  const filterSuggestions = (value, source) => {
    if (!value || value.length < 1) return [];
    const lower = value.toLowerCase();
    return source.filter(s => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower);
  };

  const handlePublisherInput = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, publisher: val });
    const filtered = filterSuggestions(val, uniquePublishers);
    setPublisherSuggestions(filtered);
    setShowPublisherSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const handleAuthorInput = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, author: val });
    const filtered = filterSuggestions(val, uniqueAuthors);
    setAuthorSuggestions(filtered);
    setShowAuthorSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const handleSuggestionKeyDown = (e, suggestions, setShow, field) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
        e.preventDefault();
        setFormData({ ...formData, [field]: suggestions[activeSuggestion] });
        setShow(false);
        setActiveSuggestion(-1);
      }
    } else if (e.key === 'Escape') {
      setShow(false);
      setActiveSuggestion(-1);
    }
  };

  const handleAutoFill = async () => {
    if (!formData.title) {
      alert('Inserisci prima un titolo!');
      return;
    }

    setIsLoading(true);
    try {
      const details = await fetchMangaDetails(formData.title);
      setFormData(prev => ({
        ...prev,
        description: details.description || prev.description,
        author: details.author || prev.author,
        publisher: details.publisher || prev.publisher,
        target: details.target || prev.target,
        status: details.status || prev.status
      }));
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [openDropdown, setOpenDropdown] = useState(null); // 'status' or 'target' or null

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault(); // Prevent form submission if button is inside form (it's not, but good practice)
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(manga.id);
  };

  // Add keydown listener for Enter key when delete modal is open
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirmDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowDeleteConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showDeleteConfirm, manga?.id]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Per favore seleziona un file immagine valido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
        setFormData({ ...formData, coverUrl: compressedDataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = (e) => {
    e.preventDefault();
    fileInputRef.current.click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return html`
    <div 
      class="modal-wrapper"
      style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);"
      onClick=${(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >

      <div class="flex-col manga-form-card" style="background: var(--surface-color); overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 20px; font-weight: bold;">${manga ? 'Modifica Manga' : 'Nuovo Manga'}</div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button 
              onClick=${handleDelete}
              style="display: ${(manga && onDelete) ? 'flex' : 'none'}; background: none; border: none; color: var(--error-color); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; align-items: center; justify-content: center; width: 40px; height: 40px;"
              onMouseEnter=${e => e.target.style.background = 'rgba(247, 118, 142, 0.1)'}
              onMouseLeave=${e => e.target.style.background = 'transparent'}
              title="Elimina Manga"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24" fill="currentColor">
                <path d="M280 936q-33 0-56.5-23.5T200 856V336h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680 936H280Zm400-600H280v520h400V336ZM360 776h80V396h-80v380Zm160 0h80V396h-80v380ZM280 336v520-520Z"/>
              </svg>
            </button>
            <button 
              onClick=${onCancel} 
              style="background: none; border: none; color: var(--text-color); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" 
              onMouseEnter=${e => e.target.style.background = 'var(--hover-bg-color)'} 
              onMouseLeave=${e => e.target.style.background = 'transparent'} 
              title="Chiudi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div style="overflow-y: auto; flex: 1; padding: 16px;">
          <form onSubmit=${handleSubmit} style="display: flex; flex-direction: column; gap: 16px;">
            
            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Titolo *</label>
              <div style="display: flex; gap: 8px;">
                <input
                  type="text"
                  value=${formData.title}
                  onInput=${(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Es. Naruto"
                  style="flex: 1; padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
                />
                <button
                  type="button"
                  onClick=${handleAutoFill}
                  disabled=${isLoading}
                  style="padding: 0 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; border-radius: 12px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px; opacity: ${isLoading ? 0.7 : 1};"
                >
                  ${isLoading ? 'Loading...' : '✨ Auto-fill'}
                </button>
              </div>
            </div>

            <!-- Cover Preview (CSS Hidden) -->
            <div style="display: ${formData.coverUrl ? 'flex' : 'none'}; justify-content: center; margin-bottom: 8px;">
              <img src="${formData.coverUrl || ''}" style="width: 120px; height: 180px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);" />
            </div>

            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Copertina</label>
              <div style="display: flex; gap: 8px;">
                <input
                  type="text"
                  value=${formData.coverUrl}
                  onInput=${(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  placeholder="URL immagine o carica file..."
                  style="flex: 1; padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
                />
                <input
                  type="file"
                  ref=${fileInputRef}
                  onChange=${handleFileUpload}
                  accept="image/*"
                  style="display: none;"
                />
                <button
                  type="button"
                  onClick=${triggerFileInput}
                  style="padding: 0 16px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; cursor: pointer; white-space: nowrap;"
                  title="Carica immagine dal dispositivo"
                >
                  📂 Carica
                </button>
                
                <!-- Remove Button (CSS Hidden) -->
                <button 
                  type="button" 
                  onClick=${(e) => { e.preventDefault(); setFormData({ ...formData, coverUrl: '' }); }}
                  style="display: ${formData.coverUrl ? 'flex' : 'none'}; align-items: center; justify-content: center; padding: 0 12px; background: rgba(247,118,142,0.1); border: 1px solid rgba(247,118,142,0.3); color: var(--error-color); border-radius: 12px; cursor: pointer; transition: background 0.2s;"
                  title="Rimuovi copertina"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Collezione</label>
              <div style="display: flex; gap: 8px;">
                <button
                  type="button"
                  onClick=${() => setFormData({ ...formData, collection: 'library' })}
                  style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid ${formData.collection === 'library' ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}; background: ${formData.collection === 'library' ? 'var(--primary-color)' : 'transparent'}; color: ${formData.collection === 'library' ? '#000' : 'var(--text-color)'}; cursor: pointer; font-weight: 600; font-size: 13px;"
                >
                  Libreria
                </button>
                <button
                  type="button"
                  onClick=${() => setFormData({ ...formData, collection: 'letture' })}
                  style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid ${formData.collection === 'letture' ? '#4DB6AC' : 'rgba(255,255,255,0.2)'}; background: ${formData.collection === 'letture' ? '#4DB6AC' : 'transparent'}; color: ${formData.collection === 'letture' ? '#000' : 'var(--text-color)'}; cursor: pointer; font-weight: 600; font-size: 13px;"
                >
                  Solo Letture
                </button>
                <button
                  type="button"
                  onClick=${() => setFormData({ ...formData, collection: 'wishlist' })}
                  style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid ${formData.collection === 'wishlist' ? '#E57373' : 'rgba(255,255,255,0.2)'}; background: ${formData.collection === 'wishlist' ? '#E57373' : 'transparent'}; color: ${formData.collection === 'wishlist' ? '#000' : 'var(--text-color)'}; cursor: pointer; font-weight: 600; font-size: 13px;"
                >
                  Wishlist
                </button>
              </div>

            <div class="flex-col" style="margin-top: 16px;">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Data Aggiunta</label>
              <style>
                .no-calendar-icon::-webkit-calendar-picker-indicator {
                  display: none !important;
                  -webkit-appearance: none;
                }
                .no-calendar-icon::-webkit-inner-spin-button,
                .no-calendar-icon::-webkit-clear-button {
                  display: none;
                }
              </style>
              <input
                type="date"
                class="no-calendar-icon"
                value=${formData.dateAdded ? formData.dateAdded.substring(0, 10) : ''}
                onInput=${(e) => setFormData({ ...formData, dateAdded: e.target.value })}
                style="padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; font-family: inherit;"
              />
            </div>
            </div>

            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Autore</label>
              <div style="position: relative;">
                <input
                  type="text"
                  ref=${authorRef}
                  value=${formData.author}
                  onInput=${handleAuthorInput}
                  onFocus=${() => {
                    const filtered = filterSuggestions(formData.author, uniqueAuthors);
                    setAuthorSuggestions(filtered);
                    setShowAuthorSuggestions(filtered.length > 0);
                  }}
                  onBlur=${() => setTimeout(() => setShowAuthorSuggestions(false), 150)}
                  onKeyDown=${(e) => handleSuggestionKeyDown(e, authorSuggestions, setShowAuthorSuggestions, 'author')}
                  placeholder="Es. Masashi Kishimoto"
                  autocomplete="off"
                  style="width: 100%; padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
                />
                ${showAuthorSuggestions && authorSuggestions.length > 0 ? html`
                  <div class="autocomplete-dropdown">
                    ${authorSuggestions.map((s, i) => html`
                      <div 
                        class="autocomplete-item ${i === activeSuggestion ? 'active' : ''}"
                        onMouseDown=${(e) => { e.preventDefault(); setFormData({...formData, author: s}); setShowAuthorSuggestions(false); }}
                        onMouseEnter=${() => setActiveSuggestion(i)}
                      >
                        <span class="autocomplete-match">${s}</span>
                        ${i === activeSuggestion ? html`<span class="autocomplete-hint">Tab ↹</span>` : ''}
                      </div>
                    `)}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Editore</label>
              <div style="position: relative;">
                <input
                  type="text"
                  ref=${publisherRef}
                  value=${formData.publisher}
                  onInput=${handlePublisherInput}
                  onFocus=${() => {
                    const filtered = filterSuggestions(formData.publisher, uniquePublishers);
                    setPublisherSuggestions(filtered);
                    setShowPublisherSuggestions(filtered.length > 0);
                  }}
                  onBlur=${() => setTimeout(() => setShowPublisherSuggestions(false), 150)}
                  onKeyDown=${(e) => handleSuggestionKeyDown(e, publisherSuggestions, setShowPublisherSuggestions, 'publisher')}
                  placeholder="Es. Star Comics"
                  autocomplete="off"
                  style="width: 100%; padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px;"
                />
                ${showPublisherSuggestions && publisherSuggestions.length > 0 ? html`
                  <div class="autocomplete-dropdown">
                    ${publisherSuggestions.map((s, i) => html`
                      <div 
                        class="autocomplete-item ${i === activeSuggestion ? 'active' : ''}"
                        onMouseDown=${(e) => { e.preventDefault(); setFormData({...formData, publisher: s}); setShowPublisherSuggestions(false); }}
                        onMouseEnter=${() => setActiveSuggestion(i)}
                      >
                        <span class="autocomplete-match">${s}</span>
                        ${i === activeSuggestion ? html`<span class="autocomplete-hint">Tab ↹</span>` : ''}
                      </div>
                    `)}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="flex-col">
              <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Descrizione</label>
              <textarea
                value=${formData.description || ''}
                onInput=${(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Inserisci la trama dell'opera..."
                rows="4"
                style="padding: 10px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; resize: none; font-family: inherit;"
              ></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="flex-col">
                <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Stato</label>
                <div class="custom-select-container">
                  <div 
                    class="custom-select-trigger" 
                    tabIndex="0"
                    onClick=${() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                    onKeyDown=${(e) => {
                      const options = ['Serie in corso', 'Serie completa', 'Volume unico'];
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const idx = options.indexOf(formData.status);
                        const next = options[(idx + 1) % options.length];
                        setFormData({ ...formData, status: next });
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const idx = options.indexOf(formData.status);
                        const next = options[(idx - 1 + options.length) % options.length];
                        setFormData({ ...formData, status: next });
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenDropdown(openDropdown === 'status' ? null : 'status');
                      } else if (e.key === 'Escape') {
                        setOpenDropdown(null);
                      }
                    }}
                  >
                    <span>${formData.status}</span>
                    <svg style="transform: ${openDropdown === 'status' ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  ${openDropdown === 'status' && html`
                    <div class="custom-select-options">
                      ${['Serie in corso', 'Serie completa', 'Volume unico'].map(opt => html`
                        <div 
                          class="custom-select-option ${formData.status === opt ? 'selected' : ''}"
                          onClick=${() => { setFormData({ ...formData, status: opt }); setOpenDropdown(null); }}
                        >
                          ${opt}
                        </div>
                      `)}
                    </div>
                  `}
                </div>
              </div>

              <div class="flex-col">
                <label style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px;">Target</label>
                <div class="custom-select-container">
                  <div 
                    class="custom-select-trigger" 
                    tabIndex="0"
                    onClick=${() => setOpenDropdown(openDropdown === 'target' ? null : 'target')}
                    onKeyDown=${(e) => {
                      const options = ['Shonen', 'Seinen', 'Shojo', 'Josei'];
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const idx = options.indexOf(formData.target);
                        const next = options[(idx + 1) % options.length];
                        setFormData({ ...formData, target: next });
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const idx = options.indexOf(formData.target);
                        const next = options[(idx - 1 + options.length) % options.length];
                        setFormData({ ...formData, target: next });
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenDropdown(openDropdown === 'target' ? null : 'target');
                      } else if (e.key === 'Escape') {
                        setOpenDropdown(null);
                      }
                    }}
                  >
                    <span>${formData.target}</span>
                    <svg style="transform: ${openDropdown === 'target' ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  ${openDropdown === 'target' && html`
                    <div class="custom-select-options">
                      ${['Shonen', 'Seinen', 'Shojo', 'Josei'].map(opt => html`
                        <div 
                          class="custom-select-option ${formData.target === opt ? 'selected' : ''}"
                          onClick=${() => { setFormData({ ...formData, target: opt }); setOpenDropdown(null); }}
                        >
                          ${opt}
                        </div>
                      `)}
                    </div>
                  `}
                </div>
              </div>
            </div>
            
            <div style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px;">
              <button
                type="button"
                onClick=${onCancel}
                style="flex: 1; padding: 12px; background: transparent; border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                onMouseEnter=${e => e.target.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave=${e => e.target.style.background = 'transparent'}
              >
                Annulla
              </button>
              <button
                type="submit"
                onClick=${handleSubmit}
                style="flex: 1; padding: 12px; background: var(--primary-color); color: #000; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; transition: transform 0.2s;"
                onMouseEnter=${e => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave=${e => e.target.style.transform = 'scale(1)'}
              >
                Salva
              </button>
            </div>
          </form>
        </div>
      </div>
      <div 
        style="display: ${showDeleteConfirm ? 'flex' : 'none'}; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2100; align-items: center; justify-content: center;"
        onClick=${(e) => { e.stopPropagation(); }}
      >
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);" onClick=${() => setShowDeleteConfirm(false)}></div>
        <div class="animate-scale-in" style="width: 90%; max-width: 400px; background: var(--surface-color); border-radius: 16px; padding: 24px; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border-color);">
          <h3 style="margin-top: 0; color: var(--text-color); font-size: 18px; margin-bottom: 12px;">Elimina Manga</h3>
          <p style="color: var(--secondary-text-color); font-size: 14px; line-height: 1.5; margin-bottom: 24px;">Sei sicuro di voler eliminare questo manga? L'azione è irreversibile.</p>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button 
              onClick=${() => setShowDeleteConfirm(false)}
              style="padding: 8px 16px; background: transparent; color: var(--text-color); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; font-weight: 600;"
            >
              Annulla
            </button>
            <button 
              onClick=${confirmDelete}
              style="padding: 8px 16px; background: var(--primary-color); color: #000; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
