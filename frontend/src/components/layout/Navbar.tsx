import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  User,
  Settings,
  LogOut,
  FileText,
  Folder,
  File,
  X,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { apiGlobalSearch, DriveFile, Folder as FolderType, Note } from '@/lib/api';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  uploadingCount?: number;
  onOpenUploadQueue?: () => void;
  onSelectFile?: (file: DriveFile) => void;
  onSelectFolder?: (folderId: string) => void;
  onSelectNote?: (noteId: string) => void;
}

export function Navbar({
  onToggleMobileMenu,
  uploadingCount = 0,
  onOpenUploadQueue,
  onSelectFile,
  onSelectFolder,
  onSelectNote,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    files: DriveFile[];
    folders: FolderType[];
    notes: Note[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced Search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiGlobalSearch(query.trim());
        setSearchResults(data.results);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to dismiss menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-30">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        aria-label="Toggle navigation drawer"
        className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl relative min-w-0" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Drive, notes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-9 sm:pl-10 pr-8 sm:pr-9 py-1.5 sm:py-2 text-xs sm:text-sm rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 focus:bg-background text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400 truncate"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSearchResults(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && (searchResults || isSearching) && (
          <div className="absolute left-0 right-0 top-12 mt-1 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 max-h-96 overflow-y-auto z-50">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching...</div>
            ) : searchResults &&
              searchResults.files.length === 0 &&
              searchResults.folders.length === 0 &&
              searchResults.notes.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No matching files or notes found</div>
            ) : (
              <div className="space-y-2">
                {/* Folders */}
                {searchResults?.folders.length ? (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Folders
                    </div>
                    {searchResults.folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          if (onSelectFolder) onSelectFolder(f.id);
                          navigate(`/drive?folderId=${f.id}`);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {f.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Files */}
                {searchResults?.files.length ? (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Files
                    </div>
                    {searchResults.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          if (onSelectFile) onSelectFile(file);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <File className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {file.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Notes */}
                {searchResults?.notes.length ? (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Notes
                    </div>
                    {searchResults.notes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          if (onSelectNote) onSelectNote(n.id);
                          navigate(`/notes?noteId=${n.id}`);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {n.title}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Upload Activity Toggle */}
        {uploadingCount > 0 && (
          <button
            onClick={onOpenUploadQueue}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold animate-pulse"
          >
            <Upload className="w-3.5 h-3.5 animate-bounce" />
            <span>Uploading ({uploadingCount})</span>
          </button>
        )}

        <ThemeToggle />

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-bold text-xs flex items-center justify-center shadow-md hover:ring-2 hover:ring-indigo-400 transition-all select-none"
          >
            {getInitials(user?.name)}
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  @{user?.username}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {user?.email}
                </div>
              </div>

              <div className="pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/settings?tab=profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/settings?tab=security');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Security &amp; Password</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    await logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
