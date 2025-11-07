/**
 * SEMANTIC SEARCH - UI CONTROLLER
 * =================================
 * 
 * This file handles all user interactions with the search interface.
 * It connects the search engine (semantic-search.js) with the UI.
 * 
 * RESPONSIBILITIES:
 * -----------------
 * 1. Initialize search when page loads
 * 2. Handle user input (typing, clicking)
 * 3. Display search results
 * 4. Manage loading states
 * 5. Handle errors gracefully
 */

import SemanticSearch from './semantic-search.js';

class SearchUI {
    constructor() {
        this.searchEngine = new SemanticSearch();
        this.searchInitialized = false;
        this.currentQuery = '';
        this.searchTimeout = null;
        this.isExpanded = false;
        
        // DOM elements (will be set in init)
        this.searchContainer = null;
        this.searchToggle = null;
        this.searchWrapper = null;
        this.searchInput = null;
        this.searchClose = null;
        this.searchClear = null;
        this.searchLoading = null;
        this.resultsContainer = null;
        this.resultsList = null;
        this.resultsCount = null;
        this.resultsTime = null;
        this.emptyState = null;
        this.loadingState = null;
    }

    /**
     * Initialize the search UI.
     * 
     * WHAT IT DOES:
     * -------------
     * 1. Finds all DOM elements
     * 2. Attaches event listeners
     * 3. Initializes search engine (lazy - on first search)
     */
    init() {
        console.log('🔍 Initializing search UI...');
        
        // Find DOM elements
        this.searchContainer = document.querySelector('.search-container');
        this.searchToggle = document.querySelector('.search-toggle');
        this.searchWrapper = document.querySelector('.search-wrapper');
        this.searchInput = document.querySelector('.search-input');
        this.searchClose = document.querySelector('.search-close');
        this.searchClear = document.querySelector('.search-clear');
        this.searchLoading = document.querySelector('.search-loading');
        this.resultsContainer = document.querySelector('.search-results');
        this.resultsList = document.querySelector('.search-results-list');
        this.resultsCount = document.querySelector('.search-results-count');
        this.resultsTime = document.querySelector('.search-results-time');
        this.emptyState = document.querySelector('.search-empty');
        this.loadingState = document.querySelector('.search-loading-state');
        
        if (!this.searchToggle || !this.searchInput) {
            console.error('Search elements not found!');
            return;
        }
        
        // Attach event listeners
        this.attachEventListeners();
        
        console.log('✓ Search UI initialized');
    }

    /**
     * Attach event listeners to search elements.
     */
    attachEventListeners() {
        // Toggle search expansion
        if (this.searchToggle) {
            this.searchToggle.addEventListener('click', () => {
                this.expandSearch();
            });
        }
        
        // Close search
        if (this.searchClose) {
            this.searchClose.addEventListener('click', () => {
                this.collapseSearch();
            });
        }
        
        // Handle input changes
        this.searchInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
        
        // Handle Enter key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(this.searchInput.value);
            }
            
            // Handle Escape key to close
            if (e.key === 'Escape') {
                this.collapseSearch();
            }
        });
        
        // Handle clear button
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isExpanded && 
                !this.searchContainer.contains(e.target)) {
                this.collapseSearch();
            }
        });
        
        // Focus input on forward slash key (like GitHub)
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                this.expandSearch();
            }
        });
    }

    /**
     * Expand search bar.
     */
    expandSearch() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        this.searchContainer.classList.add('expanded');
        
        // Focus input after animation starts
        setTimeout(() => {
            this.searchInput.focus();
        }, 100);
    }

    /**
     * Collapse search bar.
     */
    collapseSearch() {
        if (!this.isExpanded) return;
        
        this.isExpanded = false;
        this.searchContainer.classList.remove('expanded');
        this.hideResults();
        
        // Clear input
        this.searchInput.value = '';
        if (this.searchClear) {
            this.searchClear.classList.remove('active');
        }
    }

    /**
     * Handle input changes with debouncing.
     * 
     * DEBOUNCING:
     * -----------
     * Wait for user to stop typing before searching.
     * This prevents searching on every keystroke.
     * 
     * - User types: "machine"
     * - Wait 300ms...
     * - If no more typing, search for "machine"
     * - If user continues typing: "machine learning"
     * - Cancel previous search, wait another 300ms
     */
    handleInput(value) {
        // Update clear button visibility
        if (this.searchClear) {
            if (value) {
                this.searchClear.classList.add('active');
            } else {
                this.searchClear.classList.remove('active');
            }
        }
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // If input is empty, hide results
        if (!value.trim()) {
            this.hideResults();
            return;
        }
        
        // Debounce search (wait 300ms after last keystroke)
        this.searchTimeout = setTimeout(() => {
            this.performSearch(value);
        }, 300);
    }

    /**
     * Perform semantic search.
     * 
     * THE FLOW:
     * ---------
     * 1. Initialize search engine (first time only)
     * 2. Show loading state
     * 3. Run search
     * 4. Display results
     * 5. Handle errors
     */
    async performSearch(query) {
        if (!query.trim()) return;
        
        this.currentQuery = query;
        
        try {
            // Initialize search engine on first use (lazy loading)
            if (!this.searchInitialized) {
                this.showLoadingState('Initializing search engine...');
                await this.searchEngine.init();
                this.searchInitialized = true;
            }
            
            // Show searching indicator
            this.showSearchingState();
            
            // Perform search
            const startTime = performance.now();
            const results = await this.searchEngine.search(query, 10, 0.3);
            const searchTime = performance.now() - startTime;
            
            // Display results
            this.displayResults(results, searchTime);
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    /**
     * Display search results.
     * 
     * WHAT IT DOES:
     * -------------
     * 1. Clear previous results
     * 2. Create result cards
     * 3. Add to DOM
     * 4. Show results container
     */
    displayResults(results, searchTime) {
        // Hide loading state
        this.hideLoadingState();
        
        // Clear previous results
        this.resultsList.innerHTML = '';
        
        // Show results container
        this.resultsContainer.classList.add('active');
        
        // Update count and time
        if (this.resultsCount) {
            const count = results.length;
            this.resultsCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;
        }
        
        if (this.resultsTime) {
            this.resultsTime.textContent = `${searchTime.toFixed(0)}ms`;
        }
        
        // Show empty state if no results
        if (results.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Hide empty state
        this.hideEmptyState();
        
        // Create result cards
        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            this.resultsList.appendChild(resultElement);
        });
    }

    /**
     * Create a result card element.
     * 
     * STRUCTURE:
     * ----------
     * <a class="search-result-item" href="/url">
     *   <div class="search-result-header">
     *     <h3>Title</h3>
     *     <span class="score">92%</span>
     *   </div>
     *   <div class="url">URL</div>
     *   <div class="preview">Text preview with <mark>highlights</mark></div>
     * </a>
     */
    createResultElement(result) {
        const item = document.createElement('a');
        item.className = 'search-result-item';
        item.href = result.url;
        
        // Convert score to percentage
        const scorePercent = Math.round(result.score * 100);
        
        // Highlight query terms in preview
        const highlightedPreview = this.searchEngine.highlightTerms(
            result.preview,
            this.currentQuery
        );
        
        item.innerHTML = `
            <div class="search-result-header">
                <h3 class="search-result-title">${this.escapeHtml(result.title)}</h3>
                <span class="search-result-score">${scorePercent}%</span>
            </div>
            <div class="search-result-url">${this.escapeHtml(result.url)}</div>
            <div class="search-result-preview">${highlightedPreview}</div>
        `;
        
        return item;
    }

    /**
     * Show loading state.
     */
    showLoadingState(message = 'Loading search engine...') {
        if (this.loadingState) {
            const messageEl = this.loadingState.querySelector('.search-loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            this.loadingState.classList.add('active');
        }
        
        this.resultsContainer.classList.add('active');
        this.hideEmptyState();
    }

    /**
     * Show searching indicator.
     */
    showSearchingState() {
        if (this.searchLoading) {
            this.searchLoading.classList.add('active');
        }
        
        this.hideLoadingState();
        this.hideEmptyState();
    }

    /**
     * Hide loading states.
     */
    hideLoadingState() {
        if (this.loadingState) {
            this.loadingState.classList.remove('active');
        }
        
        if (this.searchLoading) {
            this.searchLoading.classList.remove('active');
        }
    }

    /**
     * Show empty state (no results).
     */
    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.add('active');
        }
    }

    /**
     * Hide empty state.
     */
    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.remove('active');
        }
    }

    /**
     * Hide all results.
     */
    hideResults() {
        this.resultsContainer.classList.remove('active');
        this.hideEmptyState();
        this.hideLoadingState();
    }

    /**
     * Clear search.
     */
    clearSearch() {
        this.searchInput.value = '';
        this.searchInput.focus();
        this.hideResults();
        
        if (this.searchClear) {
            this.searchClear.classList.remove('active');
        }
    }

    /**
     * Show error message.
     */
    showError(message) {
        this.hideLoadingState();
        
        // You could show a toast notification here
        console.error(message);
        alert(message);
    }

    /**
     * Escape HTML to prevent XSS.
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const searchUI = new SearchUI();
        searchUI.init();
    });
} else {
    const searchUI = new SearchUI();
    searchUI.init();
}

/**
 * USAGE NOTES:
 * ------------
 * 
 * 1. Include this script as a module:
 *    <script type="module" src="./js/search-ui-controller.js"></script>
 * 
 * 2. Make sure the HTML contains:
 *    - .search-input element
 *    - .search-results container
 *    - .search-results-list for results
 * 
 * 3. First search takes ~2 seconds (loads model)
 *    Subsequent searches are instant (~100ms)
 * 
 * 4. Press "/" to focus search (like GitHub)
 * 
 * 5. Model is cached by browser (works offline)
 */