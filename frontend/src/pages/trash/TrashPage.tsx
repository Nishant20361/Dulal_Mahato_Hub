import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, Folder, File, FileText } from 'lucide-react';
import { apiListTrash, apiRestoreItem, apiDeletePermanently, apiEmptyTrash } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';

export function TrashPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trashData, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: apiListTrash,
  });

  const folders = trashData?.trash.folders || [];
  const files = trashData?.trash.files || [];
  const notes = trashData?.trash.notes || [];

  const totalItems = folders.length + files.length + notes.length;

  const handleRestore = async (type: 'file' | 'folder' | 'note', id: string, name: string) => {
    try {
      await apiRestoreItem(type, id);
      toast.success(`Restored "${name}"`);
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    } catch {
      toast.error('Failed to restore item');
    }
  };

  const handleDeletePermanently = async (type: 'file' | 'folder' | 'note', id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This action cannot be undone.`)) return;

    try {
      await apiDeletePermanently(type, id);
      toast.success(`Permanently deleted "${name}"`);
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    } catch {
      toast.error('Failed to delete item permanently');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently empty the entire trash? This cannot be undone.')) return;

    try {
      await apiEmptyTrash();
      toast.success('Trash emptied successfully');
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    } catch {
      toast.error('Failed to empty trash');
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header & Empty Trash Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Trash
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Items here can be restored or permanently removed from disk
            </p>
          </div>
        </div>

        {totalItems > 0 && (
          <Button
            onClick={handleEmptyTrash}
            variant="danger"
            size="sm"
            className="rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Empty Trash
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading trash...</div>
      ) : totalItems === 0 ? (
        <div className="py-24 text-center space-y-2">
          <Trash2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-xs font-semibold text-slate-500">Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders in Trash */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Folders ({folders.length})
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
                {folders.map((folder) => (
                  <div key={folder.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {folder.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore('folder', folder.id, folder.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 text-indigo-500" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeletePermanently('folder', folder.id, folder.name)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files in Trash */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Files ({files.length})
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
                {files.map((file) => (
                  <div key={file.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <File className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatBytes(Number(file.size))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore('file', file.id, file.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 text-indigo-500" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeletePermanently('file', file.id, file.name)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes in Trash */}
          {notes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Notes ({notes.length})
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
                {notes.map((note) => (
                  <div key={note.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {note.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore('note', note.id, note.title)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 text-indigo-500" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeletePermanently('note', note.id, note.title)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
