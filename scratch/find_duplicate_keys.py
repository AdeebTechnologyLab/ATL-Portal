import os
import re

root_dir = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src'

def find_duplicate_keys(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find object literals and check for duplicate keys
    # This is rough but might catch obvious ones like the ones we just saw
    # Look for patterns like { key1: ..., key1: ... }
    
    # We'll look for blocks of code that look like object assignments
    obj_pattern = re.compile(r'\{([^}]*)\}', re.DOTALL)
    for match in obj_pattern.finditer(content):
        block = match.group(1)
        keys = []
        for line in block.splitlines():
            key_match = re.search(r'^\s*([a-zA-Z0-9_]+)\s*:', line)
            if key_match:
                key = key_match.group(1)
                if key in keys:
                    print(f"Duplicate key '{key}' in {filepath} in block starting near line {content.count('\n', 0, match.start()) + 1}")
                keys.append(key)

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.jsx'):
            find_duplicate_keys(os.path.join(root, file))
