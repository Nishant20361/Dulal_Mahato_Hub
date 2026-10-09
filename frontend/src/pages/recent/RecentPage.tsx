import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Clock, FileText, FileImage, FileVideo, FileAudio, FileCode } from 'lucide-react';
import { apiGetRecent, DriveFile } from '@/lib/api';
import { formatBytes } from '@/lib/utils';

export function RecentPage() {
  const navigate = useNavigate();
  const { setActivePreviewFile } = useOutletContext<{
    setActivePreviewFile: (file: DriveFile | null) => void;
  }>();

  const { data: recentData, isLoading } = useQuery({
    queryKey: ['recent'],
    queryFn: apiGetRecent,
  });

  const files = recentData?.recent.files || [];
  const notes = recentData?.recent.notes || [];

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <FileImage className="w-4 h-4 text-emerald-500" />;
    }
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      return <FileVideo className="w-4 h-4 text-purple-500" />;
    }
    if (['mp3', 'wav', 'm4a'].includes(ext)) {
      return <FileAudio className="w-4 h-4 text-pink-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-cyan-500" />;
    }
    return <FileText className="w-4 h-4 text-indigo-500" />;
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Recent Activity
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Files and class notes you worked on recently
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading recent activity...</div>
      ) : files.length === 0 && notes.length === 0 ? (
        <div className="py-24 text-center space-y-2">
          <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-xs font-semibold text-slate-500">No recent activity found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Recent Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recent Files ({files.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActivePreviewFile(file)}
                    className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  >
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 shrink-0">
                      {getFileIcon(file.extension)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {file.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatBytes(Number(file.size))} • {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Notes */}
          {notes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recent Notes ({notes.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes?noteId=${note.id}`)}
                    className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {note.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Modified {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
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
