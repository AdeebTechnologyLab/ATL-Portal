import { useEffect, useRef, useState } from 'react';
import { sanitizeRichHtml, isRichTextEmpty, stripHtmlToText } from '../../utils/richText';

/**
 * Safely render HTML from the visual editor (assignments, class logs).
 * Pass `clampLines` to collapse the content to N lines with a "Read more" toggle.
 */
const RichTextContent = ({
    html,
    className = '',
    emptyText = null,
    asPlainFallback = true,
    clampLines = 0,
}) => {
    const clean = sanitizeRichHtml(html);
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (!clampLines || expanded || !contentRef.current) return;
        const el = contentRef.current;
        setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    }, [clean, clampLines, expanded]);

    if (isRichTextEmpty(clean)) {
        if (emptyText) {
            return <p className={`text-sm text-gray-400 italic ${className}`}>{emptyText}</p>;
        }
        return null;
    }

    const clamped = clampLines > 0 && !expanded;
    const clampStyle = clamped
        ? {
            display: '-webkit-box',
            WebkitLineClamp: clampLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
        }
        : undefined;

    const inner = asPlainFallback && !clean.includes('<') ? (
        <p
            ref={contentRef}
            style={clampStyle}
            className={`text-sm text-gray-600 whitespace-pre-wrap leading-relaxed ${className}`}
        >
            {stripHtmlToText(clean)}
        </p>
    ) : (
        <div
            ref={contentRef}
            style={clampStyle}
            className={`rich-text-content ${className}`}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );

    if (!clampLines) {
        return inner;
    }

    return (
        <div>
            {inner}
            {isOverflowing && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-1.5 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                    {expanded ? 'Show less' : 'Read more'}
                </button>
            )}
        </div>
    );
};

export default RichTextContent;
