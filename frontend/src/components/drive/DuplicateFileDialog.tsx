import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface DuplicateFileDialogProps {
  isOpen: boolean;
  fileName: string;
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

export function DuplicateFileDialog({
  isOpen,
  fileName,
  onReplace,
  onKeepBoth,
  onCancel,
}: DuplicateFileDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title="File Already Exists"
      description="A file with this name already exists in this folder"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold">{fileName}</span> is already in this folder. What would you like to do?
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="md" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="secondary" size="md" onClick={onKeepBoth} className="w-full sm:w-auto">
            Keep Both
          </Button>
          <Button variant="primary" size="md" onClick={onReplace} className="w-full sm:w-auto">
            Replace
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
