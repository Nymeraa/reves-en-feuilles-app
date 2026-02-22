import os
import re

color_map = {
    r'#f3f4f6': 'var(--secondary)', # Gray 100
    r'#ffffff': 'var(--card)',
    r'white(?!\s*-space|\s*-out|\s*-rendering)': 'var(--card)', # Replace white but not white-space
    r'#e5e7eb': 'var(--border)', # Gray 200
    r'#111827': 'var(--foreground)', # Gray 900
    r'#6b7280': 'var(--muted-foreground)', # Gray 500
    r'#9ca3af': 'var(--muted-foreground)', # Gray 400
    r'#f9fafb': 'var(--muted)', # Gray 50
    r'#374151': 'var(--foreground)', # Gray 700
    r'#d1d5db': 'var(--border)', # Gray 300
    r'#fffbeb': 'color-mix(in srgb, var(--accent) 50%, transparent)', # Amber 50 equivalent
    r'#f9f9f9': 'var(--muted)',
    r'#eee(?!\w)': 'var(--border)',
    r'#ddd(?!\w)': 'var(--border)',
    r'#ccc(?!\w)': 'var(--muted-foreground)',
}

def process_file(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We apply replacements only within CSS blocks or style={{}} blocks
    new_content = content
    for pattern, replacement in color_map.items():
        if filepath.endswith('.css'):
            new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
        else:
            # For TSX files, replace in string literals and template literals used for styles
            # Example: borderColor: '#e5e7eb' -> borderColor: 'var(--border)'
            # We match quotes 'pattern' or "pattern"
            new_content = re.sub(r"(['\"])" + pattern + r"(['\"])", r"\g<1>" + replacement + r"\g<2>", new_content, flags=re.IGNORECASE)
            
            # Special case for white without quotes (not usually an issue in TSX but just in case)
            if pattern.startswith('white'):
                new_content = re.sub(r"(['\"])white(['\"])", r"\g<1>var(--card)\g<2>", new_content, flags=re.IGNORECASE)

    # Some manual fixes for TSX files to avoid breaking non-style strings
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

directory = r'c:\Users\Sébastien\.gemini\antigravity\scratch\src\features\LabelStudio'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))

print("Done.")
