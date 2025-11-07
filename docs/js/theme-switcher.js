/* ============================================
   THEME SWITCHER - JavaScript
   ============================================ */

class ThemeSwitcher {
  constructor() {
    this.themes = ['light', 'dark', 'ocean', 'sunset'];
    this.currentTheme = this.getStoredTheme() || 'light';
    this.init();
  }

  init() {
    // Apply stored theme immediately to prevent flash
    this.applyTheme(this.currentTheme);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupUI();
        this.updateThemeIcon();
      });
    } else {
      this.setupUI();
      this.updateThemeIcon();
    }
  }

  setupUI() {
    // Create theme switcher HTML
    const themeSwitcherHTML = `
      <div class="theme-switcher">
        <button class="theme-switcher-button" aria-label="Change theme" title="Change color theme">
          <svg class="theme-icon-light" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          <svg class="theme-icon-dark" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
        </button>
        <div class="theme-dropdown">
          <div class="theme-option" data-theme="light">
            <div class="theme-option-icon"></div>
            <span>Light</span>
          </div>
          <div class="theme-option" data-theme="dark">
            <div class="theme-option-icon"></div>
            <span>Dark</span>
          </div>
          <div class="theme-option" data-theme="ocean">
            <div class="theme-option-icon"></div>
            <span>Ocean</span>
          </div>
          <div class="theme-option" data-theme="sunset">
            <div class="theme-option-icon"></div>
            <span>Sunset</span>
          </div>
        </div>
      </div>
    `;

    // Find the header nav section
    const headerNav = document.querySelector('header nav');
    if (headerNav) {
      // Create a wrapper for the theme switcher
      const themeSwitcherWrapper = document.createElement('div');
      themeSwitcherWrapper.style.marginLeft = 'auto';
      themeSwitcherWrapper.innerHTML = themeSwitcherHTML;
      
      // Insert after the nav links
      headerNav.parentElement.insertBefore(themeSwitcherWrapper, headerNav.nextSibling);
    }

    // Attach event listeners
    this.attachEventListeners();
    
    // Update active state
    this.updateActiveTheme();
  }

  attachEventListeners() {
    const button = document.querySelector('.theme-switcher-button');
    const dropdown = document.querySelector('.theme-dropdown');
    const options = document.querySelectorAll('.theme-option');

    if (!button || !dropdown) return;

    // Toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.theme-switcher')) {
        dropdown.classList.remove('active');
      }
    });

    // Theme selection
    options.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        this.switchTheme(theme);
        dropdown.classList.remove('active');
      });
    });

    // Keyboard navigation
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dropdown.classList.toggle('active');
      }
    });
  }

  switchTheme(theme) {
    if (this.themes.includes(theme)) {
      this.currentTheme = theme;
      this.applyTheme(theme);
      this.storeTheme(theme);
      this.updateActiveTheme();
      this.updateThemeIcon();
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  updateThemeIcon() {
    const lightIcon = document.querySelector('.theme-icon-light');
    const darkIcon = document.querySelector('.theme-icon-dark');
    
    if (!lightIcon || !darkIcon) return;
    
    // Show sun icon for dark themes, moon icon for light themes
    if (this.currentTheme === 'dark') {
      lightIcon.style.display = 'block';
      darkIcon.style.display = 'none';
    } else {
      lightIcon.style.display = 'none';
      darkIcon.style.display = 'block';
    }
  }

  storeTheme(theme) {
    try {
      localStorage.setItem('davidakinboro-theme', theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('davidakinboro-theme');
    } catch (e) {
      console.warn('Could not retrieve theme preference:', e);
      return null;
    }
  }

  updateActiveTheme() {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
      if (option.getAttribute('data-theme') === this.currentTheme) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }
}

// Initialize theme switcher
const themeSwitcher = new ThemeSwitcher();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSwitcher;
}