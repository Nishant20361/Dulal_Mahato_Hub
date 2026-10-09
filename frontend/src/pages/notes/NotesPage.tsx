import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Pin,
  Trash2,
  Plus,
  Search,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  CheckCircle2,
  Loader2,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import {
  apiListNotes,
  apiCreateNote,
  apiUpdateNote,
  apiTogglePinNote,
  apiTrashNote,
  Note,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNoteId = searchParams.get('noteId');
  const actionParam = searchParams.get('action');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isMobileEditing, setIsMobileEditing] = useState(Boolean(selectedNoteId || actionParam === 'new'));

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Query notes
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['notes', searchQuery],
    queryFn: () => apiListNotes(searchQuery),
  });

  const notes = notesData?.notes || [];

  // Handle ?action=new or select first note
  useEffect(() => {
    if (actionParam === 'new') {
      handleCreateNote();
      setSearchParams({});
    }
  }, [actionParam]);

  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      const found = notes.find((n) => n.id === selectedNoteId);
      if (found) {
        setActiveNote(found);
        setTitle(found.title);
        setContent(found.content);
        setIsMobileEditing(true);
      }
    } else if (!activeNote && notes.length > 0) {
      setActiveNote(notes[0]);
      setTitle(notes[0].title);
      setContent(notes[0].content);
    }
  }, [selectedNoteId, notes]);

  // Debounced Autosave
  useEffect(() => {
    if (!activeNote) return;
    if (title === activeNote.title && content === activeNote.content) {
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const updated = await apiUpdateNote(activeNote.id, { title, content });
        setActiveNote(updated.note);
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('saved');
        toast.error('Failed to autosave note');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, content, activeNote?.id]);

  const handleCreateNote = async () => {
    try {
      const data = await apiCreateNote({ title: 'Untitled Note', content: '' });
      toast.success('New note created');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
      setActiveNote(data.note);
      setTitle(data.note.title);
      setContent(data.note.content);
      setIsMobileEditing(true);
      setSearchParams({ noteId: data.note.id });
    } catch {
      toast.error('Failed to create note');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await apiTogglePinNote(note.id);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch {
      toast.error('Failed to update pin');
    }
  };

  const handleTrashNote = async (note: Note) => {
    if (!confirm(`Move note "${note.title}" to trash?`)) return;
    try {
      await apiTrashNote(note.id);
      toast.success('Note moved to trash');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
      if (activeNote?.id === note.id) {
        setActiveNote(null);
      }
    } catch {
      toast.error('Failed to delete note');
    }
  };

  // Helper for Markdown formatting toolbar buttons
  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previous = textarea.value;
    const selectedText = previous.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const nextVal = previous.substring(0, start) + replacement + previous.substring(end);

    setContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 0);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col sm:flex-row gap-4 overflow-hidden">
      {/* LEFT PANE: Notes List */}
      <div
        className={`${
          isMobileEditing ? 'hidden sm:flex' : 'flex'
        } w-full sm:w-80 shrink-0 flex-col rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm`}
      >
        {/* Top toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Class Notes</h2>
            <Button onClick={handleCreateNote} variant="primary" size="sm" className="rounded-xl">
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Note
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 text-foreground border border-transparent focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="py-16 text-center space-y-2 px-4">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 font-medium">No notes yet</p>
              <Button onClick={handleCreateNote} variant="outline" size="sm">
                Create First Note
              </Button>
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setActiveNote(note);
                    setTitle(note.title);
                    setContent(note.content);
                    setSearchParams({ noteId: note.id });
                    setIsMobileEditing(true);
                  }}
                  className={`p-3 rounded-2xl cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {note.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                      title={note.isPinned ? 'Unpin note' : 'Pin note'}
                      className={`p-1 rounded-md transition-colors ${
                        note.isPinned
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {note.content || 'Empty note'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrashNote(note);
                      }}
                      className="p-1 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Note Editor */}
      <div
        className={`${
          !isMobileEditing ? 'hidden sm:flex' : 'flex'
        } flex-1 flex-col rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm`}
      >
        {activeNote ? (
          <>
            {/* Editor Toolbar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-1">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setIsMobileEditing(false)}
                  className="sm:hidden flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1.5 rounded-xl mr-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Notes</span>
                </button>

                <button
                  onClick={() => insertMarkdown('**', '**')}
                  title="Bold"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('*', '*')}
                  title="Italic"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('# ')}
                  title="Heading 1"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('## ')}
                  title="Heading 2"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('- ')}
                  title="Bullet List"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('1. ')}
                  title="Numbered List"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('```\n', '\n```')}
                  title="Code Block"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('[', '](https://)')}
                  title="Link"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Autosave Status Indicator */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium select-none">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Saved</span>
                  </>
                )}
              </div>
            </div>

            {/* Note Title Input */}
            <div className="px-6 pt-5 pb-2">
              <input
                type="text"
                placeholder="Note Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl sm:text-2xl font-extrabold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Note Content Textarea */}
            <div className="flex-1 px-6 pb-6 pt-2">
              <textarea
                ref={contentTextareaRef}
                placeholder="Write your notes, lecture takeaways, code snippets, or markdown here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full resize-none bg-transparent font-sans text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none leading-relaxed"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Note Selected</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Select an existing note from the list or create a new one to start writing.
            </p>
            <Button onClick={handleCreateNote} variant="primary" size="sm">
              Create Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
