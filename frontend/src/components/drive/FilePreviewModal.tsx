import { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import { DriveFile, getFileContentUrl, getFileDownloadUrl, api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';

interface FilePreviewModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  useEffect(() => {
    if (!file || !isOpen) {
      setTextContent(null);
      return;
    }

    const textExtensions = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'c', 'cpp', 'java', 'sql', 'sh', 'xml', 'yaml', 'yml'];
    const isTextFile = textExtensions.includes(file.extension.toLowerCase());

    if (isTextFile) {
      setIsLoadingText(true);
      api
        .get(`/files/${file.id}/content`, { responseType: 'text' })
        .then((res) => {
          setTextContent(String(res.data));
        })
        .catch(() => {
          setTextContent('Failed to load text preview.');
        })
        .finally(() => {
          setIsLoadingText(false);
        });
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const contentUrl = getFileContentUrl(file.id);
  const downloadUrl = getFileDownloadUrl(file.id);
  const ext = file.extension.toLowerCase();

  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
  const isText = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'c', 'cpp', 'java', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Preview Container */}
      <div className="relative z-10 w-full max-w-5xl h-[88vh] flex flex-col rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {isImage && <FileImage className="w-5 h-5" />}
              {isVideo && <FileVideo className="w-5 h-5" />}
              {isAudio && <FileAudio className="w-5 h-5" />}
              {isPdf && <FileText className="w-5 h-5" />}
              {isText && <FileCode className="w-5 h-5" />}
              {!isImage && !isVideo && !isAudio && !isPdf && !isText && <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {file.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatBytes(Number(file.size))} • {file.extension.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={file.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-950/5 dark:bg-slate-950/40 p-4 sm:p-6 flex items-center justify-center">
          {/* Image Preview */}
          {isImage && (
            <img
              src={contentUrl}
              alt={file.name}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
            />
          )}

          {/* PDF Preview */}
          {isPdf && (
            <object
              data={contentUrl}
              type="application/pdf"
              className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            >
              <iframe
                src={`${contentUrl}#toolbar=0`}
                title={file.name}
                className="w-full h-full rounded-xl border-0"
              />
            </object>
          )}

          {/* Video Preview */}
          {isVideo && (
            <video
              controls
              autoPlay={false}
              className="max-h-full max-w-full rounded-2xl shadow-xl bg-black"
            >
              <source src={contentUrl} type={file.mimeType} />
              Your browser does not support the video tag.
            </video>
          )}

          {/* Audio Preview */}
          {isAudio && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileAudio className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{formatBytes(Number(file.size))}</p>
              </div>
              <audio controls className="w-full pt-2">
                <source src={contentUrl} type={file.mimeType} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Text / Code Preview */}
          {isText && (
            <div className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-auto p-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap selection:bg-indigo-500/20">
              {isLoadingText ? (
                <div className="text-slate-400">Loading document content...</div>
              ) : (
                textContent
              )}
            </div>
          )}

          {/* Unsupported Format (e.g. DOCX, PPTX, ZIP, Binaries) */}
          {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
            <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{file.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Preview is not directly supported in-browser for this format ({file.extension.toUpperCase()}).
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Size: {formatBytes(Number(file.size))}
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={downloadUrl}
                  download={file.name}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
