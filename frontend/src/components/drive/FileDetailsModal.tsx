import { Dialog } from '@/components/ui/Dialog';
import { DriveFile } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface FileDetailsModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FileDetailsModal({ file, isOpen, onClose }: FileDetailsModalProps) {
  if (!file) return null;

  const details = [
    { label: 'File Name', value: file.name },
    { label: 'Original Name', value: file.originalName },
    { label: 'File Type', value: file.mimeType || 'Unknown' },
    { label: 'Extension', value: file.extension.toUpperCase() },
    { label: 'File Size', value: formatBytes(Number(file.size)) },
    { label: 'Location', value: file.folder ? file.folder.name : 'My Drive (Root)' },
    { label: 'Storage Engine', value: 'Local Disk (backend/storage/)' },
    { label: 'Created At', value: new Date(file.createdAt).toLocaleString() },
    { label: 'Modified At', value: new Date(file.updatedAt).toLocaleString() },
    { label: 'Last Opened', value: file.lastOpenedAt ? new Date(file.lastOpenedAt).toLocaleString() : 'Never' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="File Details"
      description="Metadata and storage information for this file"
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {details.map((item) => (
            <div key={item.label} className="p-2.5 flex items-start justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                {item.label}
              </span>
              <span className="text-slate-900 dark:text-white font-semibold text-right truncate">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
