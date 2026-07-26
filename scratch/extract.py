import re
import glob

files = glob.glob(r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\auth\*Register.jsx')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f'=== {file} ===')
    
    pattern = re.compile(r'<(h2[^>]*>.*?</h2>|InputField[^>]*>|SelectField[^>]*>|textarea[^>]*>|input[^>]*>|select[^>]*>)', re.DOTALL | re.IGNORECASE)
    for match in pattern.finditer(content):
        tag = match.group(1).strip()
        
        if tag.lower().startswith('h2'):
            header = re.sub(r'<[^>]+>', '', tag).strip()
            print(f'\n[SECTION] {header}')
        elif tag.startswith('InputField') or tag.startswith('SelectField') or tag.startswith('input') or tag.startswith('select'):
            label = re.search(r'label=[\"\']([^\"\']+)[\"\']', tag, re.IGNORECASE)
            name = re.search(r'name=[\"\']([^\"\']+)[\"\']', tag, re.IGNORECASE)
            type_attr = re.search(r'type=[\"\']([^\"\']+)[\"\']', tag, re.IGNORECASE)
            
            n = name.group(1) if name else "unknown"
            l = label.group(1) if label else n
            t = type_attr.group(1) if type_attr else ("select" if tag.lower().startswith('select') else "text")
            
            if t.lower() not in ['hidden', 'submit', 'button', 'checkbox', 'file']:
                print(f'  - {n} : {l}')
        elif tag.lower().startswith('textarea'):
            name = re.search(r'name=[\"\']([^\"\']+)[\"\']', tag, re.IGNORECASE)
            print(f'  - {name.group(1) if name else "unknown"} : textarea')
