import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HardDrive,
  FolderPlus,
  FileUp,
  FolderUp,
  FileText,
  Clock,
  Trash2,
  Settings,
  LogOut,
  Plus,
  Database,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@tanstack/react-query';
import { apiGetStorageUsage } from '@/lib/api';

interface SidebarProps {
  onNewFolder?: () => void;
  onUploadFiles?: (files: FileList | null) => void;
  onUploadFolder?: (files: FileList | null) => void;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
  onNavigate,
  onClose,
}: SidebarProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Storage usage query
  const { data: storageData } = useQuery({
    queryKey: ['storageUsage'],
    queryFn: apiGetStorageUsage,
    staleTime: 30000,
  });

  // Close + New dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const navLinks = [
    { label: 'My Drive', path: '/drive', icon: HardDrive },
    { label: 'Recent', path: '/recent', icon: Clock },
    { label: 'Notes', path: '/notes', icon: FileText },
    { label: 'Trash', path: '/trash', icon: Trash2 },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white truncate">
              Dulal Mahato Hub
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Student Cloud Drive
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hidden File / Folder inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (onUploadFiles) onUploadFiles(e.target.files);
          e.target.value = '';
        }}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        onChange={(e) => {
          if (onUploadFolder) onUploadFolder(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* + New Button & Dropdown */}
      <div className="p-4 relative" ref={newMenuRef}>
        <button
          onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all duration-150 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5" />
            <span>New</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isNewMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isNewMenuOpen && (
          <div className="absolute left-4 right-4 top-16 z-50 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 animate-in zoom-in-95">
            <button
              onClick={() => {
                setIsNewMenuOpen(false);
                onNavigate?.();
                if (onNewFolder) {
                  onNewFolder();
                } else if (!location.pathname.startsWith('/drive')) {
                  navigate('/drive');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('dmh:new-folder')), 100);
                } else {
                  window.dispatchEvent(new CustomEvent('dmh:new-folder'));
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-indigo-500" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => {
                setIsNewMenuOpen(false);
                onNavigate?.();
                if (!location.pathname.startsWith('/drive')) {
                  navigate('/drive');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('dmh:trigger-file-upload')), 100);
                } else {
                  window.dispatchEvent(new CustomEvent('dmh:trigger-file-upload'));
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <FileUp className="w-4 h-4 text-sky-500" />
              <span>Upload File</span>
            </button>

            <button
              onClick={() => {
                setIsNewMenuOpen(false);
                onNavigate?.();
                if (!location.pathname.startsWith('/drive')) {
                  navigate('/drive');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('dmh:trigger-folder-upload')), 100);
                } else {
                  window.dispatchEvent(new CustomEvent('dmh:trigger-folder-upload'));
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <FolderUp className="w-4 h-4 text-amber-500" />
              <span>Upload Folder</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            <button
              onClick={() => {
                setIsNewMenuOpen(false);
                onNavigate?.();
                navigate('/notes?action=new');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>New Note</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Storage Usage Section */}
      <div className="p-4 m-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Local Storage</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {storageData?.storage.formattedUsed || '0 MB'}
          </span>
        </div>

        {/* Storage details */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {storageData?.storage.totalFiles ?? 0}
            </span>
            <div>Files</div>
          </div>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {storageData?.storage.totalFolders ?? 0}
            </span>
            <div>Folders</div>
          </div>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {storageData?.storage.totalNotes ?? 0}
            </span>
            <div>Notes</div>
          </div>
        </div>
      </div>

      {/* Footer / Settings / Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 space-y-1">
        <NavLink
          to="/settings"
          onClick={() => onNavigate?.()}
          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
            location.pathname.startsWith('/settings')
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={() => {
            onNavigate?.();
            handleLogout();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
