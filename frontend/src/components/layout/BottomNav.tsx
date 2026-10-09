import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  FileText,
  Clock,
  Settings,
  Plus,
  FolderPlus,
  FileUp,
  FolderUp,
  X,
} from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const actionSheetRef = useRef<HTMLDivElement>(null);

  // Close action sheet on route change
  useEffect(() => {
    setIsActionSheetOpen(false);
  }, [location.pathname]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionSheetRef.current && !actionSheetRef.current.contains(e.target as Node)) {
        setIsActionSheetOpen(false);
      }
    };
    if (isActionSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionSheetOpen]);

  const handleAction = (type: 'new-folder' | 'upload-file' | 'upload-folder' | 'new-note') => {
    setIsActionSheetOpen(false);
    if (type === 'new-note') {
      navigate('/notes?action=new');
      return;
    }

    if (!location.pathname.startsWith('/drive')) {
      navigate('/drive');
      setTimeout(() => {
        if (type === 'new-folder') window.dispatchEvent(new CustomEvent('dmh:new-folder'));
        if (type === 'upload-file') window.dispatchEvent(new CustomEvent('dmh:trigger-file-upload'));
        if (type === 'upload-folder') window.dispatchEvent(new CustomEvent('dmh:trigger-folder-upload'));
      }, 150);
    } else {
      if (type === 'new-folder') window.dispatchEvent(new CustomEvent('dmh:new-folder'));
      if (type === 'upload-file') window.dispatchEvent(new CustomEvent('dmh:trigger-file-upload'));
      if (type === 'upload-folder') window.dispatchEvent(new CustomEvent('dmh:trigger-folder-upload'));
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors">
        <div className="flex items-center justify-around relative max-w-lg mx-auto">
          {/* Drive */}
          <NavLink
            to="/drive"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 min-w-[56px] text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <HardDrive className="w-5 h-5 mb-0.5" />
            <span>Drive</span>
          </NavLink>

          {/* Notes */}
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 min-w-[56px] text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Notes</span>
          </NavLink>

          {/* Center Action Button */}
          <div className="relative -top-4 flex items-center justify-center px-2">
            <button
              onClick={() => setIsActionSheetOpen(!isActionSheetOpen)}
              aria-label="Create or Upload"
              className={`w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/35 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isActionSheetOpen ? 'rotate-45 bg-rose-500 from-rose-500 to-red-600 shadow-rose-500/30' : ''
              }`}
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Recent */}
          <NavLink
            to="/recent"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 min-w-[56px] text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span>Recent</span>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 min-w-[56px] text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Action Bottom Sheet Modal for Mobile */}
      {isActionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsActionSheetOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={actionSheetRef}
            className="relative z-10 w-full max-w-md mx-auto bg-card border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/70">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Action</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload or create content in Dulal Mahato Hub
                </p>
              </div>
              <button
                onClick={() => setIsActionSheetOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleAction('new-folder')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-left hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">New Folder</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Organize files</div>
                </div>
              </button>

              <button
                onClick={() => handleAction('upload-file')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-left hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Upload Files</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">PDFs, images, etc.</div>
                </div>
              </button>

              <button
                onClick={() => handleAction('upload-folder')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 text-left hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                  <FolderUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Upload Folder</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Entire directory</div>
                </div>
              </button>

              <button
                onClick={() => handleAction('new-note')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-left hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">New Note</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Class notebook</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
