import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'hr', 'span', 'div',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];

export function sanitizeRichHtml(html) {
    if (!html) return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function stripHtmlToText(html) {
    if (!html) return '';
    const clean = sanitizeRichHtml(html);
    const tmp = document.createElement('div');
    tmp.innerHTML = clean;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

export function isRichTextEmpty(html) {
    return !stripHtmlToText(html);
}
