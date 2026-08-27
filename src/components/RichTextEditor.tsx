import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Link2, Heading1, Heading2, Heading3,
  Strikethrough, Undo, Redo, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

// ---- Slash command registry --------------------------------------------

interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  icon: React.ElementType;
  run: (editor: Editor) => void;
}

const COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Başlık 1',        hint: 'Büyük bölüm başlığı', keywords: ['h1', 'başlık', 'heading', 'title'], icon: Heading1,
    run: e => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2', label: 'Başlık 2',        hint: 'Alt başlık',           keywords: ['h2', 'başlık', 'heading'], icon: Heading2,
    run: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Başlık 3',        hint: 'Küçük başlık',         keywords: ['h3', 'başlık', 'heading'], icon: Heading3,
    run: e => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: 'ul', label: 'Madde listesi',   hint: 'Bulleted list',        keywords: ['bullet', 'list', 'liste', 'madde'], icon: List,
    run: e => e.chain().focus().toggleBulletList().run() },
  { id: 'ol', label: 'Numaralı liste',  hint: 'Numbered list',        keywords: ['number', 'liste', 'sıralı', 'ordered'], icon: ListOrdered,
    run: e => e.chain().focus().toggleOrderedList().run() },
  { id: 'quote', label: 'Alıntı',       hint: 'Blockquote',           keywords: ['quote', 'alıntı'], icon: Quote,
    run: e => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', label: 'Kod bloğu',     hint: 'Code block',           keywords: ['code', 'kod'], icon: Code,
    run: e => e.chain().focus().toggleCodeBlock().run() },
  { id: 'hr',   label: 'Ayırıcı',       hint: 'Horizontal rule',      keywords: ['hr', 'ayırıcı', 'divider', 'line'], icon: Minus,
    run: e => e.chain().focus().setHorizontalRule().run() },
];

function filterCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMANDS;
  return COMMANDS.filter(c =>
    c.label.toLowerCase().includes(q) ||
    c.keywords.some(k => k.toLowerCase().startsWith(q)),
  );
}

/** Return {query} if the caret sits at the end of a paragraph whose text
 *  starts with '/'. Returns null otherwise. */
function readSlashContext(editor: Editor): { query: string; startPos: number } | null {
  const { $from } = editor.state.selection;
  if (!editor.state.selection.empty) return null;
  // Only trigger inside a plain paragraph — not inside code blocks etc.
  if ($from.parent.type.name !== 'paragraph') return null;
  const text = $from.parent.textContent;
  if (!text.startsWith('/')) return null;
  // Caret must be at end (or at least past the /)
  const paraStart = $from.start();
  const caretOffset = $from.pos - paraStart;
  if (caretOffset < 1) return null;
  const upto = text.slice(0, caretOffset);
  // no whitespace inside the query
  if (/\s/.test(upto.slice(1))) return null;
  return { query: upto.slice(1), startPos: paraStart };
}

// ---- Slash menu overlay -------------------------------------------------

function SlashMenu({
  editor, open, onClose, query,
}: { editor: Editor; open: boolean; onClose: () => void; query: string }) {
  const items = useMemo(() => filterCommands(query), [query]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(items.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') {
        if (items[idx]) { e.preventDefault(); run(items[idx]); }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, items, idx]);

  const run = (cmd: SlashCommand) => {
    const ctx = readSlashContext(editor);
    if (ctx) {
      // Remove the "/query" so command applies to a clean paragraph.
      editor.chain().focus()
        .setTextSelection({ from: ctx.startPos, to: ctx.startPos + 1 + query.length })
        .deleteSelection().run();
    }
    cmd.run(editor);
    onClose();
  };

  if (!open || items.length === 0) return null;

  return (
    <div
      className="absolute left-2 top-full mt-1 z-50 w-72 rounded-md border border-border/60 bg-surface shadow-xl overflow-hidden"
      onMouseDown={(e) => e.preventDefault()} // don't blur editor
    >
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
        Blok ekle · /{query}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {items.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onMouseEnter={() => setIdx(i)}
            onClick={() => run(c)}
            className={cn(
              'flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[12.5px]',
              i === idx ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-sidebar-accent/40',
            )}
          >
            <c.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{c.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{c.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Editor -------------------------------------------------------------

export function RichTextEditor({
  value, onChange, placeholder = 'Bir şeyler yaz…', minHeight = 120, className,
}: RichTextEditorProps) {
  const [slash, setSlash] = useState<{ open: boolean; query: string }>({ open: false, query: '' });
  const slashRef = useRef(slash);
  slashRef.current = slash;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder + '  (/ ile blok ekle)' }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none focus:outline-none',
          'prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1',
          'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
          'prose-code:bg-secondary/60 prose-code:px-1 prose-code:rounded prose-code:text-[0.85em]',
          'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
        ),
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: ({ editor }) => {
      const ctx = readSlashContext(editor);
      if (ctx) setSlash({ open: true, query: ctx.query });
      else if (slashRef.current.open) setSlash({ open: false, query: '' });
    },
  });

  if (!editor) return null;

  const Btn = ({ onClick, active, disabled, children, title }: {
    onClick: () => void; active?: boolean; disabled?: boolean;
    children: React.ReactNode; title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-6 w-6 grid place-items-center rounded transition-colors',
        active ? 'bg-primary/15 text-primary'
               : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn('rounded-md border border-border/60 bg-background overflow-hidden relative', className)}>
      <div className="flex items-center gap-0.5 border-b border-border/60 bg-secondary/30 px-1.5 py-1">
        <Btn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-3 w-3" />
        </Btn>
        <Btn title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-3 w-3" />
        </Btn>
        <span className="h-4 w-px bg-border mx-1" />
        <Btn title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <Heading1 className="h-3 w-3" />
        </Btn>
        <Btn title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <Heading2 className="h-3 w-3" />
        </Btn>
        <Btn title="Bold (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="h-3 w-3" />
        </Btn>
        <Btn title="Italic (⌘I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="h-3 w-3" />
        </Btn>
        <Btn title="Strike" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
          <Strikethrough className="h-3 w-3" />
        </Btn>
        <span className="h-4 w-px bg-border mx-1" />
        <Btn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="h-3 w-3" />
        </Btn>
        <Btn title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="h-3 w-3" />
        </Btn>
        <Btn title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          <Quote className="h-3 w-3" />
        </Btn>
        <Btn title="Code" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>
          <Code className="h-3 w-3" />
        </Btn>
        <Btn
          title="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const prev = editor.getAttributes('link').href as string | undefined;
            const url = prompt('URL:', prev ?? 'https://');
            if (url === null) return;
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
          }}
        >
          <Link2 className="h-3 w-3" />
        </Btn>
      </div>
      <div className="relative">
        <EditorContent editor={editor} className="px-3 py-2 text-[13px]" />
        <SlashMenu
          editor={editor}
          open={slash.open}
          query={slash.query}
          onClose={() => setSlash({ open: false, query: '' })}
        />
      </div>
    </div>
  );
}

/** Read-only renderer for stored HTML. Assumes the HTML came from the editor
 *  above (which whitelists the tags it produces). */
export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-invert prose-sm max-w-none',
        'prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1',
        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
        'prose-code:bg-secondary/60 prose-code:px-1 prose-code:rounded prose-code:text-[0.85em]',
        'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
        'prose-a:text-primary prose-a:underline prose-a:underline-offset-2',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
