"""
SEMANTIC SEARCH - STEP 1: CONTENT EXTRACTION
==============================================

This script extracts searchable content from your portfolio pages.
It creates "chunks" - small pieces of text that can be searched independently.

WHY CHUNKS?
-----------
Instead of searching entire pages, we break content into smaller pieces:
- More precise search results
- Better context in snippets
- Smaller embeddings (faster search)

WHAT IT DOES:
-------------
1. Reads your HTML files
2. Extracts meaningful text (ignores nav, footer, etc.)
3. Splits into ~200-word chunks
4. Saves as JSON for embedding generation
"""

import os
import json
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import List, Dict

class ContentExtractor(HTMLParser):
    """
    Extracts clean text from HTML, ignoring navigation, footers, etc.
    
    HOW IT WORKS:
    - Inherits from HTMLParser (built-in Python HTML parser)
    - Tracks which HTML tags we're inside
    - Only captures text from meaningful sections
    - Cleans up whitespace and formatting
    """
    
    def __init__(self):
        super().__init__()
        self.text_chunks = []
        self.current_text = []
        
        # Tags to ignore (navigation, footer, etc.)
        self.ignore_tags = {'nav', 'footer', 'script', 'style', 'header'}
        self.ignore_depth = 0
        
        # Current section context
        self.current_section = None
        self.current_title = None
    
    def handle_starttag(self, tag, attrs):
        """Called when parser encounters opening tag like <div>"""
        
        # If we're in an ignore tag, increase depth counter
        if tag in self.ignore_tags:
            self.ignore_depth += 1
        
        # Track section titles for context
        if tag in ['h1', 'h2', 'h3']:
            self.current_title = tag
    
    def handle_endtag(self, tag):
        """Called when parser encounters closing tag like </div>"""
        
        # Decrease ignore depth when leaving ignored sections
        if tag in self.ignore_tags:
            self.ignore_depth = max(0, self.ignore_depth - 1)
        
        # Reset title tracking
        if tag in ['h1', 'h2', 'h3']:
            self.current_title = None
        
        # At end of paragraph, save accumulated text
        if tag == 'p' and self.current_text and self.ignore_depth == 0:
            text = ' '.join(self.current_text).strip()
            if len(text) > 20:  # Only keep meaningful paragraphs
                self.text_chunks.append(text)
            self.current_text = []
    
    def handle_data(self, data):
        """Called when parser encounters text content"""
        
        # Only capture text if not in ignored section
        if self.ignore_depth == 0:
            # Clean up whitespace
            cleaned = ' '.join(data.split())
            if cleaned:
                self.current_text.append(cleaned)
    
    def get_text_chunks(self) -> List[str]:
        """Return all extracted text chunks"""
        return self.text_chunks


def extract_content_from_html(html_path: str) -> Dict:
    """
    Extract searchable content from a single HTML file.
    
    RETURNS:
    --------
    {
        'url': '/projects/legal.html',
        'title': 'LegalReasoner Project',
        'chunks': ['chunk 1 text...', 'chunk 2 text...', ...]
    }
    """
    
    # Read HTML file
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Extract title from HTML
    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    title = title_match.group(1) if title_match else os.path.basename(html_path)
    
    # Extract URL path (relative to docs folder)
    url = '/' + os.path.relpath(html_path, 'docs')
    
    # Parse HTML and extract text
    parser = ContentExtractor()
    parser.feed(html)
    chunks = parser.get_text_chunks()
    
    return {
        'url': url,
        'title': title,
        'chunks': chunks
    }


def chunk_text(text: str, chunk_size: int = 200) -> List[str]:
    """
    Split long text into smaller chunks of ~chunk_size words.
    
    WHY THIS MATTERS:
    -----------------
    - Embeddings work best on ~100-300 word chunks
    - Too long: loses semantic focus
    - Too short: loses context
    
    HOW IT WORKS:
    -------------
    1. Split text into words
    2. Group into chunks of ~chunk_size words
    3. Keep chunks as complete sentences when possible
    """
    
    words = text.split()
    chunks = []
    
    current_chunk = []
    current_length = 0
    
    for word in words:
        current_chunk.append(word)
        current_length += 1
        
        # If chunk is big enough and we hit a sentence end, save it
        if current_length >= chunk_size and word.endswith(('.', '!', '?')):
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_length = 0
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks


def extract_all_content(docs_dir: str = 'docs') -> List[Dict]:
    """
    Extract content from all HTML files in your portfolio.
    
    WHAT IT DOES:
    -------------
    1. Finds all .html files in docs directory
    2. Extracts content from each
    3. Splits into searchable chunks
    4. Returns structured data ready for embedding
    
    OUTPUT FORMAT:
    --------------
    [
        {
            'id': 'unique_id',
            'url': '/projects/legal.html',
            'title': 'LegalReasoner Project',
            'text': 'chunk text...',
            'page_title': 'LegalReasoner Project'
        },
        ...
    ]
    """
    
    all_content = []
    chunk_id = 0
    
    # Find all HTML files
    html_files = []
    for root, dirs, files in os.walk(docs_dir):
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    print(f"Found {len(html_files)} HTML files")
    
    # Extract content from each file
    for html_path in html_files:
        print(f"Processing: {html_path}")
        
        try:
            content = extract_content_from_html(html_path)
            
            # Split each page's content into chunks
            all_text = ' '.join(content['chunks'])
            text_chunks = chunk_text(all_text)
            
            # Create a searchable item for each chunk
            for chunk in text_chunks:
                all_content.append({
                    'id': f'chunk_{chunk_id}',
                    'url': content['url'],
                    'title': content['title'],
                    'text': chunk,
                    'page_title': content['title']
                })
                chunk_id += 1
        
        except Exception as e:
            print(f"Error processing {html_path}: {e}")
    
    print(f"\nExtracted {len(all_content)} searchable chunks")
    return all_content


def save_content_index(content: List[Dict], output_path: str = 'content_index.json'):
    """
    Save extracted content to JSON file.
    
    This JSON will be used by the embedding generation script.
    """
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2, ensure_ascii=False)
    
    print(f"Saved content index to {output_path}")


if __name__ == '__main__':
    """
    USAGE:
    ------
    python extract_content.py
    
    This will:
    1. Scan your docs/ folder for HTML files
    2. Extract all meaningful text
    3. Split into searchable chunks
    4. Save to content_index.json
    
    NEXT STEP:
    ----------
    Run generate_embeddings.py to create vector embeddings
    """
    
    print("=" * 60)
    print("SEMANTIC SEARCH - CONTENT EXTRACTION")
    print("=" * 60)
    print()
    
    # Extract content from all pages
    content = extract_all_content('docs')
    
    # Save to JSON
    save_content_index(content, 'content_index.json')
    
    print()
    print("=" * 60)
    print("DONE! Next step: Run generate_embeddings.py")
    print("=" * 60)