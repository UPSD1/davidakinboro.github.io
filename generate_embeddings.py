"""
SEMANTIC SEARCH - STEP 2: EMBEDDING GENERATION
===============================================

This script converts text into "embeddings" - numerical vectors that
capture semantic meaning. This is the core of semantic search!

WHAT ARE EMBEDDINGS?
--------------------
An embedding is a list of numbers (a vector) that represents the meaning
of text. Similar meanings = similar vectors.

Example:
  "AI research" → [0.2, 0.8, 0.1, ..., 0.4]  (384 numbers)
  "Machine learning" → [0.3, 0.7, 0.2, ..., 0.5]  (384 numbers)
  "Pizza recipes" → [0.1, 0.1, 0.9, ..., 0.2]  (384 numbers)

Notice: "AI research" and "Machine learning" have similar numbers,
while "Pizza recipes" is very different. That's semantic similarity!

HOW WE USE THEM:
----------------
1. Generate embeddings for all your content (offline, once)
2. When user searches, generate embedding for their query
3. Find content embeddings most similar to query embedding
4. Return those results - they're semantically relevant!

THE MATH (simplified):
----------------------
To measure similarity between two embeddings A and B:
  similarity = cosine(A, B) = (A · B) / (|A| × |B|)

Where:
  A · B = dot product (multiply corresponding numbers, sum them up)
  |A| = magnitude (length of vector)
  |B| = magnitude (length of vector)

Result: A number between -1 and 1
  1.0 = identical meaning
  0.5 = somewhat similar
  0.0 = unrelated
 -1.0 = opposite meaning
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import os

def load_model():
    """
    Load the embedding model.
    
    MODEL: all-MiniLM-L6-v2
    -----------------------
    - Size: 80MB (small!)
    - Speed: Very fast
    - Quality: Great for search
    - Dimensions: 384 (each embedding is 384 numbers)
    
    WHY THIS MODEL:
    ---------------
    - Free and open-source
    - Fast enough for real-time search
    - Good balance of quality and speed
    - Works offline once downloaded
    
    FIRST RUN:
    ----------
    First time you run this, it downloads the model (~80MB).
    After that, it's cached locally and runs offline.
    """
    
    print("Loading embedding model...")
    print("(First run downloads ~80MB, then cached locally)")
    
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print(f"✓ Model loaded: {model.get_sentence_embedding_dimension()} dimensions")
    return model


def generate_embeddings(model, texts: List[str], batch_size: int = 32) -> np.ndarray:
    """
    Generate embeddings for a list of texts.
    
    HOW IT WORKS:
    -------------
    1. Model processes texts in batches (faster than one-by-one)
    2. For each text, generates a 384-dimensional vector
    3. Returns array of shape (num_texts, 384)
    
    BATCH SIZE:
    -----------
    - Processes 32 texts at a time (faster)
    - You can adjust based on your computer's memory
    - Larger batch = faster, but needs more RAM
    
    THE NEURAL NETWORK:
    -------------------
    The model is a transformer (like GPT, but smaller):
    1. Tokenizes text into subwords
    2. Processes through 6 attention layers
    3. Pools the output into a single 384-dim vector
    4. This vector "understands" the text's meaning
    """
    
    print(f"Generating embeddings for {len(texts)} texts...")
    print(f"Batch size: {batch_size}")
    
    # Generate embeddings (this is where the neural network runs)
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True  # Important: normalize for cosine similarity
    )
    
    print(f"✓ Generated embeddings shape: {embeddings.shape}")
    return embeddings


def save_embeddings(
    content: List[Dict],
    embeddings: np.ndarray,
    output_path: str = 'embeddings.json'
):
    """
    Save embeddings alongside content in JSON format.
    
    OUTPUT FORMAT:
    --------------
    {
        "chunks": [
            {
                "id": "chunk_0",
                "url": "/projects/legal.html",
                "title": "LegalReasoner Project",
                "text": "Full chunk text...",
                "embedding": [0.1, 0.2, ..., 0.4]  // 384 numbers
            },
            ...
        ]
    }
    
    SIZE CONSIDERATIONS:
    --------------------
    - Each embedding: 384 floats × 4 bytes = ~1.5KB
    - 100 chunks: ~150KB
    - 500 chunks: ~750KB
    - 1000 chunks: ~1.5MB
    
    This is small enough to ship with your website!
    """
    
    # Convert numpy arrays to lists (JSON-serializable)
    embeddings_list = embeddings.tolist()
    
    # Add embeddings to content chunks
    for i, chunk in enumerate(content):
        chunk['embedding'] = embeddings_list[i]
    
    # Save to JSON
    output = {
        'chunks': content,
        'model': 'all-MiniLM-L6-v2',
        'dimensions': len(embeddings_list[0]),
        'num_chunks': len(content)
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    file_size = os.path.getsize(output_path) / 1024  # KB
    print(f"✓ Saved embeddings to {output_path} ({file_size:.1f} KB)")


def test_search_similarity(model, embeddings: np.ndarray, content: List[Dict]):
    """
    Test the embeddings by running a sample search.
    
    This demonstrates how search will work:
    1. Embed the query
    2. Compare to all content embeddings
    3. Find most similar ones
    """
    
    print("\n" + "=" * 60)
    print("TESTING SEMANTIC SEARCH")
    print("=" * 60)
    
    # Sample queries to test
    test_queries = [
        "legal reasoning AI",
        "graph based knowledge",
        "teaching assistant education"
    ]
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        
        # Generate query embedding
        query_embedding = model.encode([query], normalize_embeddings=True)[0]
        
        # Calculate cosine similarity with all content
        # (This is the core of semantic search!)
        similarities = np.dot(embeddings, query_embedding)
        
        # Get top 3 results
        top_indices = np.argsort(similarities)[-3:][::-1]
        
        print("Top 3 results:")
        for i, idx in enumerate(top_indices, 1):
            chunk = content[idx]
            score = similarities[idx]
            
            # Show first 100 characters of text
            preview = chunk['text'][:100] + "..."
            
            print(f"  {i}. [{score:.3f}] {chunk['title']}")
            print(f"     {preview}")
            print()


if __name__ == '__main__':
    """
    USAGE:
    ------
    pip install sentence-transformers
    python generate_embeddings.py
    
    WHAT IT DOES:
    -------------
    1. Loads content from content_index.json
    2. Downloads embedding model (first run only)
    3. Generates embeddings for all chunks
    4. Saves embeddings.json (ready for web deployment)
    5. Runs test searches to verify it works
    
    NEXT STEP:
    ----------
    Use embeddings.json in your website's search functionality!
    """
    
    print("=" * 60)
    print("SEMANTIC SEARCH - EMBEDDING GENERATION")
    print("=" * 60)
    print()
    
    # Load content index
    print("Loading content index...")
    with open('content_index.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        content = data if isinstance(data, list) else data.get('chunks', [])
    
    print(f"✓ Loaded {len(content)} content chunks")
    print()
    
    # Load embedding model
    model = load_model()
    print()
    
    # Extract just the text for embedding
    texts = [chunk['text'] for chunk in content]
    
    # Generate embeddings
    embeddings = generate_embeddings(model, texts)
    print()
    
    # Save embeddings
    save_embeddings(content, embeddings, 'embeddings.json')
    print()
    
    # Test search functionality
    test_search_similarity(model, embeddings, content)
    
    print("=" * 60)
    print("DONE! embeddings.json is ready for deployment")
    print("=" * 60)
    print()
    print("NEXT STEPS:")
    print("1. Copy embeddings.json to your docs/ folder")
    print("2. Add search UI to your website")
    print("3. Implement client-side search with transformers.js")