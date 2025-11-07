/**
 * SEMANTIC SEARCH - CLIENT-SIDE IMPLEMENTATION
 * ==============================================
 * 
 * This JavaScript runs in the user's browser and performs semantic search
 * without any server! Here's how it works:
 * 
 * THE MAGIC:
 * ----------
 * 1. Load pre-computed embeddings (from embeddings.json)
 * 2. When user searches, use transformers.js to embed their query
 * 3. Compare query embedding to all content embeddings
 * 4. Return most similar results
 * 
 * TRANSFORMERS.JS:
 * ----------------
 * This library lets us run transformer models IN THE BROWSER using WebAssembly.
 * No server needed! First search is ~2 seconds (loads model), then instant.
 * 
 * THE MATH (Cosine Similarity):
 * ------------------------------
 * similarity = dot_product(A, B) / (magnitude(A) * magnitude(B))
 * 
 * Since our embeddings are already normalized (magnitude = 1),
 * this simplifies to just: similarity = dot_product(A, B)
 */

import { pipeline, cos_sim } from '@xenova/transformers';

class SemanticSearch {
    constructor() {
        this.embeddings = null;
        this.extractor = null;
        this.isReady = false;
        this.isLoading = false;
    }

    /**
     * Initialize the search system.
     * 
     * WHAT IT DOES:
     * -------------
     * 1. Loads embeddings.json (your content + pre-computed vectors)
     * 2. Loads the embedding model (runs in browser via WebAssembly)
     * 3. Caches model for instant subsequent searches
     * 
     * FIRST LOAD:
     * -----------
     * - Downloads model (~40MB, happens once)
     * - Cached by browser (offline after first load)
     * - Takes 2-3 seconds first time, instant after
     */
    async init() {
        if (this.isReady || this.isLoading) return;
        
        this.isLoading = true;
        console.log('🔍 Initializing semantic search...');
        
        try {
            // Load embeddings from JSON
            const response = await fetch('./embeddings.json');
            this.embeddings = await response.json();
            console.log(`✓ Loaded ${this.embeddings.chunks.length} content chunks`);
            
            // Load embedding model (transformers.js magic!)
            console.log('⚡ Loading embedding model (first time only)...');
            this.extractor = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                { 
                    quantized: true,  // Smaller model size
                    progress_callback: (progress) => {
                        if (progress.status === 'progress') {
                            console.log(`Loading: ${progress.name} - ${progress.progress.toFixed(1)}%`);
                        }
                    }
                }
            );
            
            this.isReady = true;
            this.isLoading = false;
            console.log('✓ Search ready!');
            
        } catch (error) {
            console.error('Error initializing search:', error);
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Embed text into a vector.
     * 
     * HOW IT WORKS:
     * -------------
     * 1. Tokenizes text (splits into subwords)
     * 2. Runs through transformer model
     * 3. Pools output into single 384-dim vector
     * 4. Normalizes vector (for cosine similarity)
     * 
     * SPEED:
     * ------
     * - First embedding: ~500ms (model warmup)
     * - Subsequent: ~50-100ms
     */
    async embed(text) {
        if (!this.isReady) {
            throw new Error('Search not initialized. Call init() first.');
        }
        
        // Generate embedding using transformers.js
        const output = await this.extractor(text, {
            pooling: 'mean',
            normalize: true
        });
        
        // Extract the embedding vector
        return Array.from(output.data);
    }

    /**
     * Calculate cosine similarity between two vectors.
     * 
     * THE MATH:
     * ---------
     * For normalized vectors (magnitude = 1):
     *   similarity = A[0]*B[0] + A[1]*B[1] + ... + A[n]*B[n]
     * 
     * This gives us a score from -1 to 1:
     *   1.0 = identical
     *   0.5 = somewhat similar
     *   0.0 = unrelated
     *  -1.0 = opposite
     * 
     * EXAMPLE:
     * --------
     * Query: "machine learning research"
     * Content: "AI and ML projects"
     * Similarity: 0.87 (very similar!)
     * 
     * Query: "machine learning research"
     * Content: "Italian cooking recipes"
     * Similarity: 0.12 (unrelated)
     */
    cosineSimilarity(vecA, vecB) {
        // Dot product of two vectors
        let dotProduct = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
        }
        return dotProduct;
    }

    /**
     * Search content for a query.
     * 
     * THE ALGORITHM:
     * --------------
     * 1. Embed the user's query into a vector
     * 2. Calculate similarity with ALL content embeddings
     * 3. Sort by similarity (highest first)
     * 4. Return top N results
     * 
     * PERFORMANCE:
     * ------------
     * - Query embedding: ~50-100ms
     * - Similarity calculation: ~1ms for 1000 chunks
     * - Total: ~100ms for typical portfolio
     * 
     * @param {string} query - User's search query
     * @param {number} topK - Number of results to return
     * @param {number} minScore - Minimum similarity score (0-1)
     * @returns {Array} Top search results with scores
     */
    async search(query, topK = 10, minScore = 0.3) {
        if (!this.isReady) {
            await this.init();
        }
        
        console.log(`🔍 Searching for: "${query}"`);
        const startTime = performance.now();
        
        // Step 1: Embed the query
        const queryEmbedding = await this.embed(query);
        const embedTime = performance.now() - startTime;
        console.log(`  ⚡ Query embedded in ${embedTime.toFixed(0)}ms`);
        
        // Step 2: Calculate similarity with all content
        const results = [];
        for (const chunk of this.embeddings.chunks) {
            const similarity = this.cosineSimilarity(
                queryEmbedding,
                chunk.embedding
            );
            
            // Only include results above minimum score
            if (similarity >= minScore) {
                results.push({
                    id: chunk.id,
                    url: chunk.url,
                    title: chunk.title,
                    text: chunk.text,
                    score: similarity,
                    // Create a preview snippet
                    preview: this.createPreview(chunk.text, query)
                });
            }
        }
        
        // Step 3: Sort by similarity (highest first)
        results.sort((a, b) => b.score - a.score);
        
        // Step 4: Return top K results
        const topResults = results.slice(0, topK);
        
        const totalTime = performance.now() - startTime;
        console.log(`  ✓ Found ${results.length} results in ${totalTime.toFixed(0)}ms`);
        console.log(`  📊 Top 3 scores: ${topResults.slice(0, 3).map(r => r.score.toFixed(3)).join(', ')}`);
        
        return topResults;
    }

    /**
     * Create a text preview with context around search terms.
     * 
     * WHAT IT DOES:
     * -------------
     * - Finds query words in the text
     * - Shows ~150 characters of context
     * - Highlights matching terms
     */
    createPreview(text, query, maxLength = 150) {
        // Try to find query terms in text
        const queryWords = query.toLowerCase().split(/\s+/);
        const lowerText = text.toLowerCase();
        
        // Find first occurrence of any query word
        let startIndex = 0;
        for (const word of queryWords) {
            const index = lowerText.indexOf(word);
            if (index !== -1) {
                // Start preview a bit before the match
                startIndex = Math.max(0, index - 50);
                break;
            }
        }
        
        // Extract preview
        let preview = text.slice(startIndex, startIndex + maxLength);
        
        // Add ellipsis if truncated
        if (startIndex > 0) preview = '...' + preview;
        if (startIndex + maxLength < text.length) preview += '...';
        
        return preview;
    }

    /**
     * Highlight query terms in text.
     * 
     * Used for displaying search results with highlighted matches.
     */
    highlightTerms(text, query) {
        const queryWords = query.toLowerCase().split(/\s+/);
        let highlighted = text;
        
        for (const word of queryWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            highlighted = highlighted.replace(
                regex,
                match => `<mark>${match}</mark>`
            );
        }
        
        return highlighted;
    }
}

// Export for use in your website
export default SemanticSearch;

/**
 * USAGE EXAMPLE:
 * --------------
 * 
 * // Initialize search
 * const search = new SemanticSearch();
 * await search.init();
 * 
 * // Perform search
 * const results = await search.search('legal reasoning AI');
 * 
 * // Display results
 * results.forEach(result => {
 *     console.log(`${result.title} (${result.score.toFixed(3)})`);
 *     console.log(result.preview);
 *     console.log(result.url);
 * });
 * 
 * PERFORMANCE NOTES:
 * ------------------
 * - First search: ~2 seconds (loads model)
 * - Subsequent searches: ~100ms
 * - Model cached by browser (works offline after first load)
 * - No server needed!
 * 
 * COST:
 * -----
 * $0 - Everything runs in the browser for free!
 */