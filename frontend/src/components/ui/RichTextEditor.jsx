import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Link2,
    Unlink,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Quote,
    Undo2,
    Redo2,
    RemoveFormatting,
} from 'lucide-react';

const HEADING_OPTIONS = [
    { value: 'paragraph', label: 'Paragraph' },
    { value: '1', label: 'Heading 1' },
    { value: '2', label: 'Heading 2' },
    { value: '3', label: 'Heading 3' },
    { value: '4', label: 'Heading 4' },
    { value: '5', label: 'Heading 5' },
    { value: '6', label: 'Heading 6' },
];

const ToolbarBtn = ({ onClick, active, disabled, title, children }) => (
    <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
            e.preventDefault();
            onClick?.(e);
        }}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-lg transition-colors ${
            active
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-primary dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-white'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

const runCommand = (editor, fn) => {
    if (!editor || editor.isDestroyed) return;
    fn(editor.chain().focus());
};

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = 'Start writing…',
    disabled = false,
    minHeight = '160px',
    className = '',
}) => {
    const lastHtmlRef = useRef(value || '');
    const isInternalUpdate = useRef(false);
    const [, setToolbarTick] = useState(0);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value || '',
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor: ed }) => {
            const html = ed.getHTML();
            lastHtmlRef.current = html;
            isInternalUpdate.current = true;
            onChange?.(html);
        },
        editorProps: {
            attributes: {
                class: 'rich-text-editor__body ProseMirror outline-none min-h-[120px] px-4 py-3 text-sm text-gray-800 dark:text-gray-200',
                'data-placeholder': placeholder,
            },
        },
    });

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const next = value ?? '';
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        if (next === lastHtmlRef.current) return;
        lastHtmlRef.current = next;
        editor.commands.setContent(next, false);
    }, [value, editor]);

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const bump = () => setToolbarTick((t) => t + 1);
        editor.on('selectionUpdate', bump);
        editor.on('transaction', bump);
        return () => {
            editor.off('selectionUpdate', bump);
            editor.off('transaction', bump);
        };
    }, [editor]);

    const getHeadingValue = useCallback(() => {
        if (!editor) return 'paragraph';
        for (let level = 1; level <= 6; level++) {
            if (editor.isActive('heading', { level })) return String(level);
        }
        return 'paragraph';
    }, [editor]);

    const applyHeading = useCallback(
        (val) => {
            if (!editor) return;
            runCommand(editor, (chain) => {
                if (val === 'paragraph') {
                    chain.setParagraph().run();
                } else {
                    chain.toggleHeading({ level: parseInt(val, 10) }).run();
                }
            });
        },
        [editor]
    );

    const setLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href || '';
        const url = window.prompt('Enter link URL', prev || 'https://');
        if (url === null) return;
        if (!url.trim()) {
            runCommand(editor, (chain) => chain.extendMarkRange('link').unsetLink().run());
            return;
        }
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        runCommand(editor, (chain) => chain.extendMarkRange('link').setLink({ href }).run());
    }, [editor]);

    const removeLink = useCallback(() => {
        if (!editor) return;
        runCommand(editor, (chain) => chain.extendMarkRange('link').unsetLink().run());
    }, [editor]);

    if (!editor) {
        return (
            <div
                className={`rich-text-editor border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 animate-pulse ${className}`}
                style={{ minHeight }}
            />
        );
    }

    return (
        <div
            className={`rich-text-editor border-2 border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:border-primary dark:focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}
            style={{ minHeight }}
        >
            <div className="rich-text-editor__toolbar flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80">
                <select
                    value={getHeadingValue()}
                    onMouseDown={(e) => e.preventDefault()}
                    onChange={(e) => applyHeading(e.target.value)}
                    disabled={disabled}
                    className="h-9 px-2 mr-1 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:border-primary cursor-pointer"
                    title="Heading style"
                >
                    {HEADING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <span className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-0.5" />

                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleBold().run())}
                    active={editor.isActive('bold')}
                    disabled={disabled}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleItalic().run())}
                    active={editor.isActive('italic')}
                    disabled={disabled}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleUnderline().run())}
                    active={editor.isActive('underline')}
                    disabled={disabled}
                    title="Underline"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarBtn>

                <span className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-0.5" />

                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleBulletList().run())}
                    active={editor.isActive('bulletList')}
                    disabled={disabled}
                    title="Bullet list"
                >
                    <List className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleOrderedList().run())}
                    active={editor.isActive('orderedList')}
                    disabled={disabled}
                    title="Numbered list"
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.toggleBlockquote().run())}
                    active={editor.isActive('blockquote')}
                    disabled={disabled}
                    title="Quote"
                >
                    <Quote className="w-4 h-4" />
                </ToolbarBtn>

                <span className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-0.5" />

                <ToolbarBtn onClick={setLink} active={editor.isActive('link')} disabled={disabled} title="Insert link">
                    <Link2 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={removeLink} disabled={disabled || !editor.isActive('link')} title="Remove link">
                    <Unlink className="w-4 h-4" />
                </ToolbarBtn>

                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.setTextAlign('left').run())}
                    active={editor.isActive({ textAlign: 'left' })}
                    disabled={disabled}
                    title="Align left"
                >
                    <AlignLeft className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.setTextAlign('center').run())}
                    active={editor.isActive({ textAlign: 'center' })}
                    disabled={disabled}
                    title="Align center"
                >
                    <AlignCenter className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.setTextAlign('right').run())}
                    active={editor.isActive({ textAlign: 'right' })}
                    disabled={disabled}
                    title="Align right"
                >
                    <AlignRight className="w-4 h-4" />
                </ToolbarBtn>

                <span className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-0.5" />

                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.undo().run())}
                    disabled={disabled || !editor.can().undo()}
                    title="Undo"
                >
                    <Undo2 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => runCommand(editor, (c) => c.redo().run())}
                    disabled={disabled || !editor.can().redo()}
                    title="Redo"
                >
                    <Redo2 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() =>
                        runCommand(editor, (c) => c.clearNodes().unsetAllMarks().run())
                    }
                    disabled={disabled}
                    title="Clear formatting"
                >
                    <RemoveFormatting className="w-4 h-4" />
                </ToolbarBtn>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
