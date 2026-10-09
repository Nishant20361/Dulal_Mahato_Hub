import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder as FolderIcon, HardDrive, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { apiListFolders } from '@/lib/api';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'file' | 'folder';
  currentFolderId: string | null;
  onMove: (targetFolderId: string | null) => Promise<void>;
}

export function MoveModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  currentFolderId,
  onMove,
}: MoveModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: folderData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['allFolders'],
    queryFn: () => apiListFolders(undefined, true),
    enabled: isOpen,
  });

  const allFolders = folderData?.folders || [];

  // Filter out the folder itself if we are moving a folder
  const availableFolders = itemType === 'folder'
    ? allFolders.filter((f) => f.id !== itemId)
    : allFolders;

  const handleConfirmMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to move item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move ${itemType === 'file' ? 'File' : 'Folder'}`}
      description="Select the destination folder"
    >
      <div className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2 max-h-60 overflow-y-auto space-y-1">
          {/* Root Choice: My Drive */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
              selectedFolderId === null
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>My Drive (Root)</span>
            </div>
            {selectedFolderId === null && <Check className="w-4 h-4" />}
          </button>

          {/* Folder Choices */}
          {isLoadingFolders ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading folders...</div>
          ) : (
            availableFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  selectedFolderId === f.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
                {selectedFolderId === f.id && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleConfirmMove} isLoading={isLoading}>
            Move Here
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
