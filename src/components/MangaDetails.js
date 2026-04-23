import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import Modal from './Modal.js';

export default function MangaDetails({ manga, onEdit, onBack, onUpdate }) {
  const [volumes, setVolumes] = useState(manga.volumes || []);
  const [newVolume, setNewVolume] = useState({ name: '', price: '', read: false });
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => { },
    onCancel: () => { }
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // If modal is open, let Modal component handle it (it uses capture too)
        if (modalState.isOpen) return;

        e.preventDefault();
        e.stopPropagation();

        if (isAddingVolume) {
          setIsAddingVolume(false);
        } else {
          onBack();
        }
      }
    };
    // Use capture phase to ensure this runs before App.js listener
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onBack, modalState.isOpen, isAddingVolume]);

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

  const handleAddVolume = (e) => {
    e.preventDefault();
    if (!newVolume.name) return;

    let volumesToAdd = [];
    // Split by comma to handle lists like "1, 2, 5, 10"
    const parts = newVolume.name.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);

      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);

        if (start <= end) {
          for (let i = start; i <= end; i++) {
            volumesToAdd.push({
              id: Date.now() + i + Math.random(), // Ensure unique ID
              name: `${i}`,
              price: newVolume.price,
              read: newVolume.read,
              readDate: newVolume.read ? new Date().toISOString() : null,
              dateAdded: new Date().toISOString()
            });
          }
        }
      } else {
        // Single volume
        volumesToAdd.push({
          id: Date.now() + Math.random(), // Ensure unique ID
          name: part,
          price: newVolume.price,
          read: newVolume.read,
          readDate: newVolume.read ? new Date().toISOString() : null,
          dateAdded: new Date().toISOString()
        });
      }
    }

    if (volumesToAdd.length > 0) {
      const updatedVolumes = [...volumes, ...volumesToAdd];
      setVolumes(updatedVolumes);
      onUpdate({ ...manga, volumes: updatedVolumes });
      setNewVolume({ name: '', price: '', read: false });
      setIsAddingVolume(false);
    }
  };

  const toggleRead = (volId) => {
    const updatedVolumes = volumes.map(v => {
      if (v.id === volId) {
        const isRead = !v.read;
        return {
          ...v,
          read: isRead,
          readDate: isRead ? (v.readDate || new Date().toISOString()) : null
        };
      }
      return v;
    });
    setVolumes(updatedVolumes);
    onUpdate({ ...manga, volumes: updatedVolumes });
  };

  const deleteVolume = (volId) => {
    showModal('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo volume?', 'confirm', () => {
      const updatedVolumes = volumes.filter(v => v.id !== volId);
      setVolumes(updatedVolumes);
      onUpdate({ ...manga, volumes: updatedVolumes });
    });
  };

  const getTotalCost = () => {
    return volumes.reduce((total, vol) => {
      const price = parseFloat(vol.price);
      return total + (isNaN(price) ? 0 : price);
    }, 0).toFixed(2);
  };

  const markReadUntil = (targetVol) => {
    const volName = targetVol.name || targetVol.number || '?';
    showModal('Segna come letti', `Vuoi segnare come letti tutti i volumi fino al Vol. ${volName}?`, 'confirm', () => {
      const sorted = [...volumes].sort((a, b) => {
        const numA = parseFloat(a.name);
        const numB = parseFloat(b.name);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });

      const targetIndex = sorted.findIndex(v => v.id === targetVol.id);
      if (targetIndex === -1) return;

      const idsToMark = new Set(sorted.slice(0, targetIndex + 1).map(v => v.id));

      const updatedVolumes = volumes.map(v =>
        idsToMark.has(v.id) ? {
          ...v,
          read: true,
          readDate: v.readDate || new Date().toISOString()
        } : v
      );

      setVolumes(updatedVolumes);
      onUpdate({ ...manga, volumes: updatedVolumes });
    });
  };

  return html`
    <div 
      class="animate-fade-in manga-details-overlay"
      style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
      onClick=${(e) => { if (e.target === e.currentTarget) onBack(); }}
    >
      <!-- Styling for Layout -->
      <style>
        @media (min-width: 768px) {
          .manga-details-card {
            height: 85vh;
          }
        }
      </style>
      <!-- Modal Card -->
      <div 
        class="flex-col animate-slide-up manga-details-card" 
        style="background: var(--surface-color); width: 100%; max-width: 600px; max-height: 85vh; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid var(--border-color);"
      >
        
        <!-- Mobile Header (Cover + Info) -->
        <div class="mobile-only" style="padding: 72px 16px 16px 16px; display: flex; gap: 16px;">
          <!-- Cover -->
          <div style="width: 140px; height: 210px; flex-shrink: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 16px rgba(0,0,0,0.4);">
             <img 
              src="${manga.coverUrl || 'https://placehold.co/200x300/333/666?text=No+Cover'}" 
              style="width: 100%; height: 100%; object-fit: cover;" 
            />
          </div>
          <!-- Info -->
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${manga.title}</div>
            <div style="display: flex; align-items: center; gap: 6px; color: var(--secondary-text-color); font-size: 13px; margin-bottom: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 0 16 16" width="14" fill="currentColor"><path d="m5.6 11.6-1.2-1.2c-.8-.2-2-.1-2.7 1-.8 1.1-.3 2.8-1.7 4.6 0 0 3.5 0 4.8-1.3 1.2-1.2 1.2-2.2 1-3zm.2-3.5c-.2.3-.5.7-.7 1 0 .2-.1.3-.2.4L6.4 11c.1-.1.3-.2.4-.3.3-.2.7-.4 1-.7.4 0 .6-.2.8-.4L6.4 7.4c-.2.2-.4.4-.6.7m10-7.9c-.3-.3-.7-.3-1-.1 0 0-3 2.5-5.9 5.1-.4.4-.7.7-1.1 1-.2.2-.4.4-.6.5l2.1 2.1c.2-.2.4-.4.5-.7.3-.4.6-.7.9-1.1 2.5-3 5.1-5.9 5.1-5.9.3-.2.3-.6 0-.9"/></svg>
              ${manga.author || 'Autore sconosciuto'}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; color: var(--secondary-text-color); font-size: 13px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 448" fill="currentColor" style="flex-shrink: 0;"><title>calendar</title><g><path style="fill:currentColor" d="M338.214 193.631v189.277H297.97V239.115q-3.322 2.94-7.922 5.622a91 91 0 0 1-9.582 4.727 103 103 0 0 1-10.604 3.578 84 84 0 0 1-10.86 2.044v-33.985q15.715-4.6 29.64-11.755 13.928-7.155 25.17-15.715zM115.016 374.93v-35.135q18.398 13.415 42.93 13.415 15.458 0 24.019-6.644 8.688-6.643 8.688-18.526 0-12.266-10.732-18.909-10.605-6.644-29.258-6.644H133.67v-30.918h15.715q35.774 0 35.774-23.765 0-22.358-27.47-22.358-18.398 0-35.773 11.882v-32.963q19.291-9.71 44.973-9.71 28.108 0 43.695 12.648 15.715 12.65 15.715 32.836 0 35.901-36.413 44.973v.638q19.42 2.428 30.664 14.182 11.243 11.627 11.243 28.62 0 25.68-18.781 40.628t-51.873 14.949q-28.363 0-46.123-9.2m11.35-370.795c-25.15 0-45.397 21.13-45.397 47.375V67.3H50.705c-16.766 0-30.264 14.086-30.264 31.583v315.829c0 17.496 13.498 31.582 30.264 31.582h363.17c16.766 0 30.264-14.086 30.264-31.582V98.882c0-17.496-13.498-31.582-30.264-31.582H383.61V51.509c0-26.246-20.247-47.375-45.397-47.375s-45.396 21.13-45.396 47.375V67.3H171.762V51.509c0-26.246-20.247-47.375-45.397-47.375m0 31.583c8.383 0 15.132 7.043 15.132 15.792v47.374c0 8.748-6.75 15.791-15.133 15.791s-15.132-7.043-15.132-15.791V51.509c0-8.749 6.75-15.792 15.132-15.792m211.848 0c8.384 0 15.132 7.043 15.132 15.792v47.374c0 8.748-6.748 15.791-15.132 15.791-8.383 0-15.132-7.043-15.132-15.791V51.509c0-8.749 6.75-15.792 15.132-15.792M50.705 162.05h363.17v252.663H50.705z" transform="matrix(1.05736 0 0 1.0132 -21.613 -4.189)"/></g></svg>
              Manga aggiunto il ${manga.dateAdded ? new Date(manga.dateAdded).toLocaleDateString('it-IT') : 'Data sconosciuta'}
            </div>
          </div>
        </div>

        <!-- Desktop Header (Android Style) -->
        <div class="desktop-only" style="padding: 48px 24px 24px 24px; display: flex; gap: 24px; position: relative;">
          <!-- Cover -->
          <div style="width: 140px; height: 210px; flex-shrink: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 16px rgba(0,0,0,0.4);">
             <img 
              src="${manga.coverUrl || 'https://placehold.co/200x300/333/666?text=No+Cover'}" 
              style="width: 100%; height: 100%; object-fit: cover;" 
            />
          </div>
         
          <!-- Info -->
          <div class="flex-col" style="flex: 1; min-width: 0; justify-content: center;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${manga.title}</div>
            
            <div style="display: flex; align-items: center; gap: 6px; color: var(--secondary-text-color); font-size: 13px; margin-bottom: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 0 16 16" width="14" fill="currentColor"><path d="m5.6 11.6-1.2-1.2c-.8-.2-2-.1-2.7 1-.8 1.1-.3 2.8-1.7 4.6 0 0 3.5 0 4.8-1.3 1.2-1.2 1.2-2.2 1-3zm.2-3.5c-.2.3-.5.7-.7 1 0 .2-.1.3-.2.4L6.4 11c.1-.1.3-.2.4-.3.3-.2.7-.4 1-.7.4 0 .6-.2.8-.4L6.4 7.4c-.2.2-.4.4-.6.7m10-7.9c-.3-.3-.7-.3-1-.1 0 0-3 2.5-5.9 5.1-.4.4-.7.7-1.1 1-.2.2-.4.4-.6.5l2.1 2.1c.2-.2.4-.4.5-.7.3-.4.6-.7.9-1.1 2.5-3 5.1-5.9 5.1-5.9.3-.2.3-.6 0-.9"/></svg>
              ${manga.author || 'Autore sconosciuto'}
            </div>
            
            <div style="display: flex; align-items: center; gap: 6px; color: var(--secondary-text-color); font-size: 13px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 448" fill="currentColor" style="flex-shrink: 0;"><title>calendar</title><g><path style="fill:currentColor" d="M338.214 193.631v189.277H297.97V239.115q-3.322 2.94-7.922 5.622a91 91 0 0 1-9.582 4.727 103 103 0 0 1-10.604 3.578 84 84 0 0 1-10.86 2.044v-33.985q15.715-4.6 29.64-11.755 13.928-7.155 25.17-15.715zM115.016 374.93v-35.135q18.398 13.415 42.93 13.415 15.458 0 24.019-6.644 8.688-6.643 8.688-18.526 0-12.266-10.732-18.909-10.605-6.644-29.258-6.644H133.67v-30.918h15.715q35.774 0 35.774-23.765 0-22.358-27.47-22.358-18.398 0-35.773 11.882v-32.963q19.291-9.71 44.973-9.71 28.108 0 43.695 12.648 15.715 12.65 15.715 32.836 0 35.901-36.413 44.973v.638q19.42 2.428 30.664 14.182 11.243 11.627 11.243 28.62 0 25.68-18.781 40.628t-51.873 14.949q-28.363 0-46.123-9.2m11.35-370.795c-25.15 0-45.397 21.13-45.397 47.375V67.3H50.705c-16.766 0-30.264 14.086-30.264 31.583v315.829c0 17.496 13.498 31.582 30.264 31.582h363.17c16.766 0 30.264-14.086 30.264-31.582V98.882c0-17.496-13.498-31.582-30.264-31.582H383.61V51.509c0-26.246-20.247-47.375-45.397-47.375s-45.396 21.13-45.396 47.375V67.3H171.762V51.509c0-26.246-20.247-47.375-45.397-47.375m0 31.583c8.383 0 15.132 7.043 15.132 15.792v47.374c0 8.748-6.75 15.791-15.133 15.791s-15.132-7.043-15.132-15.791V51.509c0-8.749 6.75-15.792 15.132-15.792m211.848 0c8.384 0 15.132 7.043 15.132 15.792v47.374c0 8.748-6.748 15.791-15.132 15.791-8.383 0-15.132-7.043-15.132-15.791V51.509c0-8.749 6.75-15.792 15.132-15.792M50.705 162.05h363.17v252.663H50.705z" transform="matrix(1.05736 0 0 1.0132 -21.613 -4.189)"/></g></svg>
               Manga aggiunto il ${manga.dateAdded ? new Date(manga.dateAdded).toLocaleDateString('it-IT') : 'Data sconosciuta'}
            </div>
          </div>
        </div>
          


        <!-- Actions Top Right -->
        <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px; align-items: center;">
            <button 
              onClick=${onEdit} 
              style="background: none; border: none; color: var(--text-color); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" 
              onMouseEnter=${e => e.target.style.background = 'var(--hover-bg-color)'} 
              onMouseLeave=${e => e.target.style.background = 'transparent'} 
              title="Modifica"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button 
              onClick=${onBack}
              style="background: none; border: none; color: var(--text-color); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; z-index: 20;"
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

        <!-- Scrollable Content -->
        <div style="overflow-y: auto; flex: 1; padding-bottom: 16px;">
        
          <div style="padding: 0 24px 24px 24px;">
             <!-- Mobile Description with Blur/Expand -->
             ${manga.description ? html`
              <div style="position: relative;">
                <div 
                  style="${isDescriptionExpanded ? '' : 'max-height: 80px; mask-image: linear-gradient(to bottom, black 60%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);'} overflow: hidden; color: var(--secondary-text-color); font-size: 14px; line-height: 1.5; transition: max-height 0.3s ease; white-space: pre-wrap;"
                >
                  ${manga.description}
                </div>
                <!-- Expand Chevron (Only if truncated? We assume desc is long enough for now or always show it) -->
                <button 
                  onClick=${() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  style="border: none; background: transparent; width: 100%; display: flex; justify-content: center; padding-top: 4px; cursor: pointer; color: var(--secondary-text-color);"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24" fill="currentColor" style="transition: transform 0.3s; transform: rotate(${isDescriptionExpanded ? '180deg' : '0deg'});">
                    <path d="M480 711 240 471l56-56 184 184 184-184 56 56-240 240Z"/>
                  </svg>
                </button>
              </div>
            ` : null}

            <!-- Mobile Tags Chips -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
               ${['Editore', 'Target', 'Stato'].map(tagLabel => {
    let val = '';
    if (tagLabel === 'Editore') val = manga.publisher;
    if (tagLabel === 'Target') val = manga.target;
    if (tagLabel === 'Stato') val = manga.status;

    if (!val) return null;

    return html`
                    <div style="
                      border: 1px solid var(--border-color); 
                      border-radius: 12px; 
                      padding: 6px 12px; 
                      font-size: 12px; 
                      color: var(--text-color); 
                      /* background: rgba(255,255,255,0.03); */
                    ">
                      ${val}
                    </div>
                  `;
  })}
            </div>
            </div>




          <!-- Volumes Header -->
          <!-- Volumes Header -->
          <div class="flex justify-between items-center" style="padding: 16px 24px; position: sticky; top: 0; background: var(--surface-color); z-index: 10;">
             <div style="font-size: 15px; font-weight: bold; color: var(--text-color);">
               ${volumes.length} ${volumes.length === 1 ? 'volume' : 'volumi'} <span style="font-weight: normal; color: var(--secondary-text-color);">• Spesa:</span> <span style="color: var(--primary-color);">€ ${getTotalCost()}</span>
            </div>
            <button 
              onClick=${() => setIsAddingVolume(!isAddingVolume)} 
              style="background: rgba(125, 207, 255, 0.1); border: none; color: var(--primary-color); cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onMouseEnter=${e => { e.target.style.background = 'var(--primary-color)'; e.target.style.color = 'black'; }}
              onMouseLeave=${e => { e.target.style.background = 'rgba(125, 207, 255, 0.1)'; e.target.style.color = 'var(--primary-color)'; }}
            >
              <svg 
                class="icon-plus-minus ${isAddingVolume ? 'rotated' : ''}"
                xmlns="http://www.w3.org/2000/svg" 
                height="20" 
                viewBox="0 96 960 960" 
                width="20" 
                fill="currentColor"
              >
                <path d="M440 856V616H200v-80h240V296h80v240h240v80H520v240h-80z"/>
              </svg>
            </button>
          </div>

          <!-- Add Volume Form (Animated) -->
          ${isAddingVolume ? html`
            <div 
              class="animate-expand"
              style="
                margin: 0 24px 16px;
                padding: 16px; 
                background: rgba(0,0,0,0.2);
                border-radius: 12px;
                border: 1px solid var(--border-color);
              "
            >
              <form onSubmit=${handleAddVolume}>
                <div style="font-weight: bold; margin-bottom: 12px; font-size: 14px;">Nuovo Volume</div>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                  <input 
                    type="text" 
                    name="volumeName"
                    id="volumeName"
                    autocomplete="off"
                    placeholder="Nome o Range (es. 1, 1-10, Speciale)" 
                    value=${newVolume.name}
                    onInput=${(e) => setNewVolume({ ...newVolume, name: e.target.value })}
                    style="padding: 12px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; outline: none; transition: all 0.2s;"
                    onFocus=${e => { e.target.style.borderColor = 'var(--primary-color)'; }}
                    onBlur=${e => { e.target.style.borderColor = 'var(--border-color)'; }}
                  />
                  <div style="position: relative;">
                    <input 
                      type="number" 
                      name="volumePrice"
                      id="volumePrice"
                      placeholder="Prezzo (€)" 
                      value=${newVolume.price}
                      onInput=${(e) => setNewVolume({ ...newVolume, price: e.target.value })}
                      step="0.01"
                      style="width: 100%; padding: 12px; background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; outline: none; transition: all 0.2s; appearance: none; -moz-appearance: textfield;"
                      onFocus=${e => { e.target.style.borderColor = 'var(--primary-color)'; }}
                      onBlur=${e => { e.target.style.borderColor = 'var(--border-color)'; }}
                    />
                    <style>
                      input[type=number]::-webkit-inner-spin-button, 
                      input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                      }
                    </style>
                  </div>
                </div>
                <div style="display: flex; gap: 12px;">
                  <button 
                    type="button"
                    onClick=${() => setIsAddingVolume(false)}
                    style="flex: 1; padding: 10px; background: transparent; border: 1px solid var(--border-color); color: var(--text-color); border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                    onMouseEnter=${e => e.target.style.background = 'var(--hover-bg-color)'}
                    onMouseLeave=${e => e.target.style.background = 'transparent'}
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit"
                    style="flex: 1; padding: 10px; background: var(--primary-color); color: #000; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: transform 0.2s;"
                    onMouseEnter=${e => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave=${e => e.target.style.transform = 'scale(1)'}
                  >
                    Salva
                  </button>
                </div>
              </form>
            </div>
          ` : null}

          <!-- Volumes List -->
          <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 24px;">
            ${volumes.length === 0 ? html`
              <div style="text-align: center; padding: 32px; color: var(--secondary-text-color); font-style: italic;">
                Nessun volume aggiunto
              </div>
            ` : null}
            ${[...volumes].sort((a, b) => {
    // Helper to extract the first number from a string
    const extractNumber = (str) => {
      const match = String(str).match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : NaN;
    };

    // Use name or number, fallback to empty string
    const valA = a.name || a.number || '';
    const valB = b.name || b.number || '';

    const numA = extractNumber(valA);
    const numB = extractNumber(valB);

    // If both have numbers, compare them
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    // Fallback to string comparison
    return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
  }).map(vol => html`
              <div 
                key=${vol.id}
                class="volume-item"
                style="display: flex; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; transition: all 0.2s ease; border: 1px solid var(--border-color); gap: 8px;"
                onMouseEnter=${e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave=${e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              >
                <div style="display: flex; flex-direction: column; flex: 1; min-width: 0; margin-right: 8px;">
                  <span style="font-weight: bold; font-size: 15px; word-break: break-word; line-height: 1.2;">Vol. ${(vol.name || vol.number || '?')}</span>
                  ${vol.price ? html`<span style="font-size: 11px; color: var(--secondary-text-color); margin-top: 2px;">€${'\u00A0'}${parseFloat(vol.price).toFixed(2)}</span>` : null}
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0;">
                  
                  ${vol.read && html`
                    <input 
                        type="date" 
                        class="volume-date-input"
                        value=${vol.readDate ? new Date(vol.readDate).toISOString().slice(0, 10) : ''}
                        onChange=${(e) => {
                            let newDate = null;
                            if (e.target.value) {
                                newDate = new Date(e.target.value).toISOString();
                            }
                            const updatedVolumes = volumes.map(v =>
                                v.id === vol.id ? { ...v, readDate: newDate } : v
                            );
                            setVolumes(updatedVolumes);
                            onUpdate({ ...manga, volumes: updatedVolumes });
                        }}
                        style="
                            background: rgba(0, 0, 0, 0.2);
                            border: 1px solid var(--border-color);
                            color: var(--secondary-text-color);
                            border-radius: 8px;
                            padding: 0 4px;
                            height: 28px;
                            font-size: 11px;
                            width: 86px;
                            text-align: center;
                            cursor: pointer;
                            font-family: inherit;
                            box-sizing: border-box;
                            transition: border-color 0.2s;
                            position: relative;
                            display: flex;
                            align-items: center;
                        "
                        onClick=${(e) => {
                            if (e.target.showPicker) {
                                try { e.target.showPicker(); } catch (err) {}
                            }
                        }}
                        onMouseEnter=${e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                        onMouseLeave=${e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        title="Data di lettura"
                    />
                  `}

                  <button 
                    title="Segna come letto fino a qui"
                    onClick=${(e) => { e.stopPropagation(); markReadUntil(vol); }}
                    style="
                      padding: 5px; 
                      border-radius: 50%; 
                      border: 1px solid var(--border-color); 
                      cursor: pointer; 
                      transition: all 0.2s;
                      background: rgba(0, 0, 0, 0.2);
                      color: var(--secondary-text-color);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-shrink: 0;
                    "
                    onMouseEnter=${e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onMouseLeave=${e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'; e.currentTarget.style.color = 'var(--secondary-text-color)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5L13 16"></path></svg>
                  </button>

                  <button 
                    onClick=${(e) => { e.stopPropagation(); toggleRead(vol.id); }}
                    style="
                      padding: 4px 10px; 
                      border-radius: 10px; 
                      font-size: 10px; 
                      font-weight: 700; 
                      cursor: pointer; 
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                      background: transparent;
                      color: ${vol.read ? 'var(--primary-color)' : 'var(--secondary-text-color)'};
                      transform: scale(1);
                      letter-spacing: 0.5px;
                      border: 1px solid ${vol.read ? 'var(--primary-color)' : 'var(--secondary-text-color)'};
                      flex-shrink: 0;
                      white-space: nowrap;
                    "
                    onMouseDown=${e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp=${e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ${vol.read ? 'LETTO' : 'DA LEGGERE'}
                  </button>
                  <button onClick=${() => deleteVolume(vol.id)} style="background: none; border: none; color: var(--error-color); cursor: pointer; opacity: 0.6; transition: opacity 0.2s; padding: 4px; display: flex; align-items: center; flex-shrink: 0; margin-left: 2px;" onMouseEnter=${e => e.target.style.opacity = '1'} onMouseLeave=${e => e.target.style.opacity = '0.6'}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 96 960 960" width="16" fill="currentColor"><path d="M280 936q-33 0-56.5-23.5T200 856V336h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680 936H280Zm400-600H280v520h400V336ZM360 776h80V396h-80v380Zm160 0h80V396h-80v380ZM280 336v520-520Z"/></svg>
                  </button>
                </div>
              </div >
      `)}
          </div>
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
    </div>
  `;
}
