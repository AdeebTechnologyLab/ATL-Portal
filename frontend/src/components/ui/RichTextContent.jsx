import { sanitizeRichHtml, isRichTextEmpty, stripHtmlToText } from '../../utils/richText';

/**
 * Safely render HTML from the visual editor (assignments, class logs).
 */
const RichTextContent = ({
    html,
    className = '',
    emptyText = null,
    asPlainFallback = true,
}) => {
    const clean = sanitizeRichHtml(html);

    if (isRichTextEmpty(clean)) {
        if (emptyText) {
            return <p className={`text-sm text-gray-400 italic ${className}`}>{emptyText}</p>;
        }
        return null;
    }

    if (asPlainFallback && !clean.includes('<')) {
        return (
            <p className={`text-sm text-gray-600 whitespace-pre-wrap leading-relaxed ${className}`}>
                {stripHtmlToText(clean)}
            </p>
        );
    }

    return (
        <div
            className={`rich-text-content ${className}`}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
};

export default RichTextContent;
