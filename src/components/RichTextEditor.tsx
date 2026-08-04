import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Link2, Heading1, Heading2,
  Strikethrough, Undo, Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export function RichTextEditor({
  value, onChange, placeholder = 'Bir şeyler yaz…', minHeight = 120, className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
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
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn('rounded-md border border-border/60 bg-background overflow-hidden', className)}>
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
      <EditorContent editor={editor} className="px-3 py-2 text-[13px]" />
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
