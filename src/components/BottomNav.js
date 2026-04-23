import { h } from 'preact';
import { html } from 'htm/preact';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    {
      id: 'library',
      label: 'Libreria',
      // Icons from App.js (Windows)
      icon: html`<g class="book-left"><rect x="4.5" y="3" width="6.5" height="18" rx="1.5" /><path d="M4.5 7h6.5" opacity="0.4" /></g><g class="book-right"><rect x="13" y="3" width="6.5" height="18" rx="1.5" /><path d="M13 7h6.5" opacity="0.4" /></g>`
    },
    {
      id: 'letture',
      label: 'Letture',
      icon: html`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />`
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: html`<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />`
    },
    {
      id: 'updates',
      label: 'Stats',
      icon: html`<rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="9" width="4" height="12" rx="1" /><rect x="17" y="5" width="4" height="16" rx="1" />`
    },
    {
      id: 'info',
      label: 'Impostazioni',
      icon: html`<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />`
    }
  ];

  return html`
    <div class="bottom-nav mobile-only">
      ${tabs.map(tab => {
    const isActive = activeTab === tab.id;
    let animationClass = '';

    if (isActive) {
      if (tab.id === 'library') animationClass = ' icon-library-tilt';
      else if (tab.id === 'letture') animationClass = ' icon-slide-up';
      else if (tab.id === 'wishlist') animationClass = ' icon-heartbeat';
      else if (tab.id === 'updates') animationClass = ' icon-grow-bars';
      else if (tab.id === 'info') animationClass = ' icon-rotate-gear';
    }

    return html`
        <div 
          class="bottom-nav-item ${isActive ? 'active' : ''}"
          onClick=${() => setActiveTab(tab.id)}
          style="color: ${isActive ? 'var(--primary-color)' : 'var(--text-color)'};"
        >
          <svg 
            class="bottom-nav-icon ${animationClass}"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          >
            ${tab.id === 'library'
        ? (isActive ? (tab.iconOpen || tab.icon) : (tab.iconClosed || tab.icon))
        : tab.icon
      }
          </svg>
          <span class="bottom-nav-label">${tab.label}</span>
        </div>
      `
  })}
    </div>
  `;
};

export default BottomNav;
