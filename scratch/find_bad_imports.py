import os
import re

root_dir = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src'
pattern = re.compile(r'^\s*([A-Z][a-zA-Z0-9]*,?\s*)+\n\s*([A-Z][a-zA-Z0-9]*,?\s*)*\s*}\s*from\s*\'lucide-react\';', re.MULTILINE)

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if "} from 'lucide-react';" in line:
            # Look up until we find 'import {' or start of file
            found_import = False
            for j in range(i - 1, -1, -1):
                if 'import {' in lines[j]:
                    found_import = True
                    break
                if 'import' in lines[j] and 'from' in lines[j]: # single line import
                    found_import = True
                    break
                if lines[j].strip() == '':
                    continue
                if not any(c.isalnum() for c in lines[j]): # just symbols
                    continue
                # If we reach here, check if it's just a list of icons
                if re.match(r'^\s*([A-Z][a-zA-Z0-9]*,?\s*)+$', lines[j]):
                    continue
                else:
                    # Found something else before 'import {'
                    break
            
            if not found_import:
                print(f"Potential issue in {filepath} at line {i+1}")

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.jsx'):
            check_file(os.path.join(root, file))
