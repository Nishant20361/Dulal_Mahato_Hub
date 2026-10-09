import { useState } from 'react';
import { ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'waiting' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface UploadQueueDrawerProps {
  items: UploadItem[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export function UploadQueueDrawer({ items, isOpen, onClose, onClear }: UploadQueueDrawerProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const totalFiles = items.length;
  const completedFiles = items.filter((i) => i.status === 'completed').length;
  const failedFiles = items.filter((i) => i.status === 'failed').length;
  const hasUploading = items.some((i) => i.status === 'uploading' || i.status === 'waiting');

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white select-none">
        <div className="flex items-center gap-2">
          {hasUploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          ) : failedFiles > 0 ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-bold">
            {hasUploading
              ? `Uploading ${completedFiles}/${totalFiles}`
              : failedFiles > 0
              ? `${completedFiles}/${totalFiles} Uploaded (${failedFiles} Failed)`
              : `${totalFiles} Uploads Complete`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-300"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item List */}
      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 max-w-[200px]">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {formatBytes(item.size)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className={item.status === 'failed' ? 'text-rose-500 font-medium' : 'text-slate-400'}>
                  {item.status === 'failed' ? (item.error || 'FAILED') : item.status.toUpperCase()}
                </span>
                <span className="text-slate-400">{item.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
