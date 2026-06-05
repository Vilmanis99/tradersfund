#!/usr/bin/env python3
"""
Parse WordPress XML export into Next.js content files.
Outputs:
  - content/pages/<slug>.mdx  for each published page
  - content/posts/<slug>.mdx  for each published post
  - content/data/firms.json   for prop firm table
  - content/data/images.json  list of all attachment URLs
  - content/data/posts-meta.json  all post metadata
"""

import xml.etree.ElementTree as ET
import re
import json
import os
import sys
from pathlib import Path

XML_PATH = Path(__file__).parent.parent.parent / "tradersfundhub.WordPress.2026-03-23.xml"
OUT_DIR = Path(__file__).parent.parent

NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}

def text(el):
    return (el.text or '').strip() if el is not None else ''

def clean_html(html):
    """Strip Elementor/WP shortcodes and normalize content."""
    # Remove elementor CSS blocks
    html = re.sub(r'/\*!? elementor.*?\*/', '', html, flags=re.DOTALL)
    # Remove WP shortcodes like [su_...] [/su_...]
    html = re.sub(r'\[/?[a-z_]+[^\]]*\]', '', html)
    # Fix relative URLs to absolute
    html = html.replace('href="/', 'href="https://tradersfundhub.com/')
    return html.strip()

def make_frontmatter(data: dict) -> str:
    lines = ['---']
    for k, v in data.items():
        if isinstance(v, list):
            lines.append(f'{k}:')
            for item in v:
                safe_item = str(item).replace('"', '\\"')
                lines.append(f'  - "{safe_item}"')
        elif isinstance(v, str):
            safe = v.replace('"', '\\"').replace('\n', ' ')
            lines.append(f'{k}: "{safe}"')
        else:
            lines.append(f'{k}: {v}')
    lines.append('---')
    return '\n'.join(lines)

def parse():
    print(f"Parsing: {XML_PATH}")
    tree = ET.parse(str(XML_PATH))
    root = tree.getroot()
    channel = root.find('channel')
    items = channel.findall('item')

    pages_dir = OUT_DIR / 'content' / 'pages'
    posts_dir = OUT_DIR / 'content' / 'posts'
    data_dir = OUT_DIR / 'content' / 'data'

    for d in [pages_dir, posts_dir, data_dir]:
        d.mkdir(parents=True, exist_ok=True)

    pages_count = 0
    posts_count = 0
    images = []
    posts_meta = []
    firms_table = None

    for item in items:
        pt = item.find('wp:post_type', NS)
        if pt is None:
            continue
        post_type = pt.text

        status = item.find('wp:status', NS)
        status_text = text(status)

        # --- PAGES ---
        if post_type == 'page' and status_text == 'publish':
            title_el = item.find('title')
            slug_el = item.find('wp:post_name', NS)
            content_el = item.find('content:encoded', NS)
            date_el = item.find('wp:post_date', NS)

            title = text(title_el)
            slug = text(slug_el)
            content = clean_html(text(content_el))
            date = text(date_el)[:10] if text(date_el) else ''

            # Get meta description from Yoast or excerpt
            excerpt_el = item.find('excerpt:encoded', NS)
            excerpt = text(excerpt_el)[:160]

            fm = make_frontmatter({
                'title': title,
                'slug': slug,
                'date': date,
                'description': excerpt or title,
                'type': 'page',
            })

            out_path = pages_dir / f'{slug}.mdx'
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(fm + '\n\n')
                f.write(content)
            pages_count += 1
            print(f"  PAGE: {slug}")

        # --- POSTS ---
        elif post_type == 'post' and status_text == 'publish':
            title_el = item.find('title')
            slug_el = item.find('wp:post_name', NS)
            content_el = item.find('content:encoded', NS)
            date_el = item.find('wp:post_date', NS)
            author_el = item.find('dc:creator', NS)
            excerpt_el = item.find('excerpt:encoded', NS)
            modified_el = item.find('wp:post_modified', NS)

            title = text(title_el)
            slug = text(slug_el)
            content = clean_html(text(content_el))
            date = text(date_el)[:10] if text(date_el) else ''
            modified = text(modified_el)[:10] if text(modified_el) else ''
            author = text(author_el)
            excerpt = text(excerpt_el)
            cats = [c.text for c in item.findall('category') if c.get('domain') == 'category' and c.text]
            tags = [c.text for c in item.findall('category') if c.get('domain') == 'post_tag' and c.text]

            # Featured image from postmeta
            featured_image = ''
            metas = item.findall('wp:postmeta', NS)
            for m in metas:
                mk = m.find('wp:meta_key', NS)
                mv = m.find('wp:meta_value', NS)
                if mk is not None and mk.text == '_thumbnail_id':
                    featured_image = text(mv)

            fm = make_frontmatter({
                'title': title,
                'slug': slug,
                'date': date,
                'modified': modified,
                'author': author,
                'excerpt': excerpt[:200] if excerpt else '',
                'categories': cats,
                'tags': tags,
                'type': 'post',
            })

            out_path = posts_dir / f'{slug}.mdx'
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(fm + '\n\n')
                f.write(content)
            posts_count += 1

            posts_meta.append({
                'title': title,
                'slug': slug,
                'date': date,
                'modified': modified,
                'author': author,
                'excerpt': excerpt[:200] if excerpt else '',
                'categories': cats,
                'tags': tags,
            })
            print(f"  POST: {slug}")

        # --- ATTACHMENTS ---
        elif post_type == 'attachment':
            link_el = item.find('link')
            title_el = item.find('title')
            # Get actual file URL from guid
            guid_el = item.find('guid')
            images.append({
                'title': text(title_el),
                'url': text(guid_el) or text(link_el),
                'page_url': text(link_el),
            })

        # --- TABLEPRESS TABLES ---
        elif post_type == 'tablepress_table':
            title_el = item.find('title')
            content_el = item.find('content:encoded', NS)
            table_title = text(title_el)
            if 'Main Directory' in table_title or 'Main' in table_title:
                raw = text(content_el)
                try:
                    table_data = json.loads(raw)
                    if firms_table is None or len(table_data) > len(firms_table or []):
                        firms_table = table_data
                        print(f"  TABLE: {table_title} ({len(table_data)} rows)")
                except Exception as e:
                    print(f"  TABLE parse error for {table_title}: {e}")

    # --- Save data files ---
    with open(data_dir / 'images.json', 'w', encoding='utf-8') as f:
        json.dump(images, f, indent=2, ensure_ascii=False)

    with open(data_dir / 'posts-meta.json', 'w', encoding='utf-8') as f:
        json.dump(posts_meta, f, indent=2, ensure_ascii=False)

    # Parse firm table into structured data
    if firms_table:
        firms = parse_firms_table(firms_table)
        with open(data_dir / 'firms.json', 'w', encoding='utf-8') as f:
            json.dump(firms, f, indent=2, ensure_ascii=False)
        print(f"  Saved {len(firms)} firms to firms.json")

    print(f"\nDone! Pages: {pages_count}, Posts: {posts_count}, Images: {len(images)}")

def parse_firms_table(table_data):
    """Parse the TablePress HTML rows into structured firm data."""
    firms = []
    if not table_data or len(table_data) < 2:
        return firms

    for row in table_data[1:]:  # skip header row
        if not row or not any(row):
            continue
        try:
            # Extract text from HTML cells
            def strip(html):
                return re.sub(r'<[^>]+>', ' ', str(html)).strip()
                
            def extract_link(html):
                m = re.search(r'href=["\']([^"\']+)["\']', str(html))
                return m.group(1) if m else ''
            
            def extract_img(html):
                m = re.search(r'src=["\']([^"\']+)["\']', str(html))
                return m.group(1) if m else ''
            
            def extract_chips(html):
                return re.findall(r'class=["\']tfh-chip["\'][^>]*>([^<]+)<', str(html))

            name = strip(row[0]) if len(row) > 0 else ''
            founded = strip(row[1]) if len(row) > 1 else ''
            assets_raw = row[2] if len(row) > 2 else ''
            max_alloc = strip(row[3]) if len(row) > 3 else ''
            platforms_raw = row[4] if len(row) > 4 else ''
            score_raw = strip(row[5]) if len(row) > 5 else ''
            review_raw = row[6] if len(row) > 6 else ''

            score_match = re.search(r'[\d.]+', score_raw)
            score = float(score_match.group()) if score_match else 0

            logo_url = extract_img(row[0]) if len(row) > 0 else ''
            review_url = extract_link(review_raw) if len(row) > 6 else ''
            assets = extract_chips(assets_raw)
            platforms = extract_chips(platforms_raw)
            
            # Clean name (remove extra spaces)
            name = re.sub(r'\s+', ' ', name).strip()

            if name:
                firms.append({
                    'name': name,
                    'founded': founded,
                    'assets': assets,
                    'maxAllocation': max_alloc,
                    'platforms': platforms,
                    'score': score,
                    'logo': logo_url,
                    'reviewUrl': review_url,
                })
        except Exception as e:
            print(f"  Row parse error: {e}")
            continue
    return firms

if __name__ == '__main__':
    parse()
