const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '../frontend/src');

const targetRegex = /const getSocketURL\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};/g;
const replacement = `const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\\/api\\/?$/, '');
};`;

const exportTargetRegex = /export const getSocketURL\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};/g;
const exportReplacement = `export const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\\/api\\/?$/, '');
};`;

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (targetRegex.test(content)) {
                content = content.replace(targetRegex, replacement);
                modified = true;
            }
            if (exportTargetRegex.test(content)) {
                content = content.replace(exportTargetRegex, exportReplacement);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated socket URL helper in: ${path.relative(directory, fullPath)}`);
            }
        }
    }
}

console.log('Starting socket URL updates...');
walkDir(directory);
console.log('Completed socket URL updates successfully.');
