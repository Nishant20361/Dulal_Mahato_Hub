import { useState, useRef, useEffect, Fragment, type Dispatch, type SetStateAction, type DragEvent } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Folder as FolderIcon,
  FolderPlus,
  FileUp,
  FolderUp,
  Download,
  Edit2,
  FolderInput,
  Info,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  ChevronRight,
  HardDrive,
  UploadCloud,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Check,
  CheckSquare,
  Square,
  X,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  apiListFolders,
  apiListFiles,
  apiGetFolder,
  apiCreateFolder,
  apiRenameFolder,
  apiMoveFolder,
  apiTrashFolder,
  apiUploadFile,
  apiRenameFile,
  apiMoveFile,
  apiTrashFile,
  getFileDownloadUrl,
  getFileContentUrl,
  DriveFile,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';
import { NewFolderModal } from '@/components/drive/NewFolderModal';
import { RenameModal } from '@/components/drive/RenameModal';
import { MoveModal } from '@/components/drive/MoveModal';
import { FileDetailsModal } from '@/components/drive/FileDetailsModal';
import { DuplicateFileDialog } from '@/components/drive/DuplicateFileDialog';
import { UploadQueueDrawer, UploadItem } from '@/components/drive/UploadQueueDrawer';
import { parseDroppedItems } from '@/lib/drag-drop';

export function DrivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folderId') || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { setActivePreviewFile, setUploadingCount } = useOutletContext<{
    setActivePreviewFile: (file: DriveFile | null) => void;
    setUploadingCount: Dispatch<SetStateAction<number>>;
  }>();

  // Layout & Sorting states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Modal states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [detailsTargetFile, setDetailsTargetFile] = useState<DriveFile | null>(null);

  // Context dropdown menu state for cards
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleCloseMenu = () => setOpenMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Upload queue state
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  // Drag & drop overlay state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Duplicate file dialog state
  const [duplicateResolution, setDuplicateResolution] = useState<{
    file: globalThis.File;
    existingName: string;
    relativePath?: string;
  } | null>(null);

  // File & Folder input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: folderDetails } = useQuery({
    queryKey: ['folderDetails', currentFolderId],
    queryFn: () => (currentFolderId ? apiGetFolder(currentFolderId) : null),
    enabled: Boolean(currentFolderId),
  });

  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: () => apiListFolders(currentFolderId),
  });

  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: () => apiListFiles(currentFolderId),
  });

  const folders = foldersData?.folders || [];
  const files = filesData?.files || [];

  // Sort files & folders
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'size') return Number(b.size) - Number(a.size);
    return 0;
  });

  // Selection states
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Clear selection on folder navigation
  useEffect(() => {
    setSelectedFolderIds(new Set());
    setSelectedFileIds(new Set());
  }, [currentFolderId]);

  const selectedCount = selectedFolderIds.size + selectedFileIds.size;
  const totalItemsCount = folders.length + files.length;
  const isAllSelected = totalItemsCount > 0 && selectedCount === totalItemsCount;

  const toggleSelectFolder = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectFile = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFolderIds(new Set());
      setSelectedFileIds(new Set());
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedFolderIds(new Set());
    setSelectedFileIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    const confirmMessage = `Move ${selectedCount} selected item${selectedCount > 1 ? 's' : ''} to trash?`;
    if (!confirm(confirmMessage)) return;

    setIsDeletingSelected(true);
    try {
      const folderPromises = Array.from(selectedFolderIds).map((id) => apiTrashFolder(id));
      const filePromises = Array.from(selectedFileIds).map((id) => apiTrashFile(id));
      await Promise.all([...folderPromises, ...filePromises]);

      toast.success(`Moved ${selectedCount} item${selectedCount > 1 ? 's' : ''} to trash`);
      setSelectedFolderIds(new Set());
      setSelectedFileIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    } catch {
      toast.error('Failed to move some items to trash');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Upload handler
  const executeUpload = async (file: globalThis.File, conflictAction: 'replace' | 'keep_both' = 'keep_both', relativePath?: string) => {
    const uploadId = Math.random().toString(36).substring(2, 9);
    const newUploadItem: UploadItem = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    };

    setUploadQueue((prev) => [...prev, newUploadItem]);
    setIsUploadDrawerOpen(true);
    setUploadingCount((prev: number) => prev + 1);

    const formData = new FormData();
    formData.append('files', file);
    if (currentFolderId) formData.append('folderId', currentFolderId);
    if (relativePath) formData.append('relativePath', relativePath);
    formData.append('conflictAction', conflictAction);

    try {
      await apiUploadFile(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, progress: percent } : item))
        );
      });

      setUploadQueue((prev) =>
        prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'completed' } : item))
      );
      toast.success(`Uploaded ${file.name}`);
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    } catch (err: any) {
      setUploadQueue((prev) =>
        prev.map((item) => (item.id === uploadId ? { ...item, status: 'failed', error: 'Upload failed' } : item))
      );
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploadingCount((prev: number) => Math.max(0, prev - 1));
    }
  };

  // Listen to sidebar trigger events
  useEffect(() => {
    const handleNewFolderEvent = () => setIsNewFolderOpen(true);
    const handleUploadFilesEvent = () => fileInputRef.current?.click();
    const handleUploadFolderEvent = () => folderInputRef.current?.click();

    window.addEventListener('dmh:new-folder', handleNewFolderEvent);
    window.addEventListener('dmh:trigger-file-upload', handleUploadFilesEvent);
    window.addEventListener('dmh:trigger-folder-upload', handleUploadFolderEvent);

    return () => {
      window.removeEventListener('dmh:new-folder', handleNewFolderEvent);
      window.removeEventListener('dmh:trigger-file-upload', handleUploadFilesEvent);
      window.removeEventListener('dmh:trigger-folder-upload', handleUploadFolderEvent);
    };
  }, []);

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      // Check if duplicate in current folder
      const isDuplicate = files.some((f) => f.name === file.name);
      if (isDuplicate) {
        setDuplicateResolution({ file, existingName: file.name });
      } else {
        executeUpload(file, 'keep_both');
      }
    });
  };

  const handleFolderSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (const file of Array.from(selectedFiles)) {
      const relPath = (file as any).webkitRelativePath || file.name;
      await executeUpload(file, 'keep_both', relPath);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    try {
      const { files: droppedFiles, emptyFolders } = await parseDroppedItems(e.dataTransfer);

      // Create any empty folders dropped directly
      for (const emptyFolder of emptyFolders) {
        const folderName = emptyFolder.split('/').pop() || emptyFolder;
        try {
          await apiCreateFolder(folderName, currentFolderId);
          queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
        } catch {
          // ignore duplicate or error
        }
      }

      // Upload all files sequentially with preserved relative paths
      for (const { file, relativePath } of droppedFiles) {
        await executeUpload(file, 'keep_both', relativePath);
      }
    } catch (err) {
      console.error('Failed to parse dropped items:', err);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    }
  };

  // Helper file icon renderer
  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <FileImage className="w-5 h-5 text-emerald-500" />;
    }
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      return <FileVideo className="w-5 h-5 text-purple-500" />;
    }
    if (['mp3', 'wav', 'm4a'].includes(ext)) {
      return <FileAudio className="w-5 h-5 text-pink-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-cyan-500" />;
    }
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  // Large icon renderer for card preview body
  const getFileIconLarge = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <FileImage className="w-9 h-9 text-emerald-500" />;
    }
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return <FileVideo className="w-9 h-9 text-purple-500" />;
    }
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) {
      return <FileAudio className="w-9 h-9 text-pink-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-9 h-9 text-amber-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'c', 'cpp', 'java'].includes(ext)) {
      return <FileCode className="w-9 h-9 text-cyan-500" />;
    }
    return <FileText className="w-9 h-9 text-indigo-500" />;
  };

  // Breadcrumbs builder
  const breadcrumbs = folderDetails?.breadcrumbs || [{ id: null, name: 'My Drive' }];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[85vh] flex flex-col space-y-6 pb-20"
    >
      {/* Hidden Upload Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          handleFilesSelected(e.target.files);
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
          handleFolderSelected(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-indigo-600/15 dark:bg-indigo-500/20 border-2 border-dashed border-indigo-500 rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <div className="p-5 rounded-3xl bg-card border border-indigo-300 dark:border-indigo-800 shadow-2xl flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Drop files here to upload
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Files will be saved into {folderDetails?.folder.name || 'My Drive'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs Bar */}
      <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold select-none overflow-x-auto no-scrollbar py-1">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <Fragment key={crumb.id || 'root'}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              <button
                onClick={() => {
                  if (crumb.id) {
                    setSearchParams({ folderId: crumb.id });
                  } else {
                    setSearchParams({});
                  }
                }}
                className={`px-2 py-1 rounded-lg transition-colors truncate max-w-[140px] sm:max-w-xs shrink-0 ${
                  isLast
                    ? 'text-slate-900 dark:text-white font-extrabold cursor-default'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {crumb.id === null ? (
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-indigo-500 inline" />
                    My Drive
                  </span>
                ) : (
                  crumb.name
                )}
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            onClick={() => setIsNewFolderOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs px-2.5 sm:px-3"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            <span>New Folder</span>
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs px-2.5 sm:px-3"
          >
            <FileUp className="w-3.5 h-3.5 mr-1 text-sky-500" />
            <span>Upload Files</span>
          </Button>

          <Button
            onClick={() => folderInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="rounded-xl hidden sm:inline-flex"
          >
            <FolderUp className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            <span>Upload Folder</span>
          </Button>

          {/* Select All Toggle */}
          {totalItemsCount > 0 && (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className={`rounded-xl text-xs px-2.5 sm:px-3 transition-colors ${
                isAllSelected
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : ''
              }`}
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              ) : (
                <Square className="w-3.5 h-3.5 mr-1 text-slate-400" />
              )}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </Button>
          )}

          {/* Delete Selected Button */}
          {selectedCount > 0 && (
            <Button
              onClick={handleDeleteSelected}
              disabled={isDeletingSelected}
              variant="danger"
              size="sm"
              className="rounded-xl text-xs px-2.5 sm:px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs animate-in zoom-in-95"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Delete ({selectedCount})</span>
            </Button>
          )}
        </div>

        {/* Right View & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
            <span className="text-slate-400 pl-1.5 pr-0.5">
              <ArrowUpDown className="w-3 h-3" />
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none pr-2 cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="size">Size</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Folder and File Browser */}
      {isLoadingFolders || isLoadingFiles ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading items...</div>
      ) : sortedFolders.length === 0 && sortedFiles.length === 0 ? (
        /* Empty State */
        <div className="py-24 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-500">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No files here yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Upload your class notes, PDFs, code files, or create a folder to get organized.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button onClick={() => setIsNewFolderOpen(true)} variant="outline" size="sm">
              New Folder
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="primary" size="sm">
              Upload File
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {sortedFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Folders ({sortedFolders.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedFolders.map((folder) => {
                  const isSelected = selectedFolderIds.has(folder.id);
                  return (
                    <div
                      key={folder.id}
                      onDoubleClick={() => setSearchParams({ folderId: folder.id })}
                      className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all select-none cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/40 shadow-sm'
                          : 'border-slate-200/80 dark:border-slate-800 bg-card hover:border-indigo-400/60 dark:hover:border-indigo-500/40 hover:shadow-md'
                      }`}
                    >
                      {/* Folder Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectFolder(folder.id, e)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 mr-2.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : selectedCount > 0
                            ? 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                            : 'border border-slate-300 dark:border-slate-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:border-indigo-500'
                        }`}
                        title={isSelected ? 'Deselect folder' : 'Select folder'}
                        aria-label={isSelected ? 'Deselect folder' : 'Select folder'}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div
                        onClick={() => setSearchParams({ folderId: folder.id })}
                        className="flex items-center gap-2.5 min-w-0 flex-1 pr-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <FolderIcon className="w-5 h-5 fill-current" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {folder.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {folder._count ? `${folder._count.files} files` : 'Folder'}
                          </p>
                        </div>
                      </div>

                      {/* Clean Dropdown Menu Toggle */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === folder.id ? null : folder.id)}
                          title="Folder options"
                          className={`p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                            openMenuId === folder.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === folder.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-30 w-44 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 text-xs font-medium space-y-0.5"
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setRenameTarget({ id: folder.id, name: folder.name, type: 'folder' });
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Rename Folder</span>
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setMoveTarget({ id: folder.id, type: 'folder' });
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Move Folder</span>
                            </button>

                            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                            <button
                              onClick={async () => {
                                setOpenMenuId(null);
                                if (confirm(`Move folder "${folder.name}" to trash?`)) {
                                  await apiTrashFolder(folder.id);
                                  toast.success(`Moved "${folder.name}" to trash`);
                                  queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
                                  queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to Trash</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                );
              })}
              </div>
            </div>
          )}

          {/* Files Section */}
          {sortedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Files ({sortedFiles.length})
              </h3>

              {viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {sortedFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(file.extension.toLowerCase());
                    return (
                      <div
                        key={file.id}
                        onClick={() => setActivePreviewFile(file)}
                        className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none bg-card hover:shadow-lg ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-sm'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-500/40'
                        }`}
                      >
                        {/* Top Bar: Checkbox & Actions */}
                        <div className="flex items-center justify-between mb-2 z-10" onClick={(e) => e.stopPropagation()}>
                          {/* File Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => toggleSelectFile(file.id, e)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : selectedCount > 0
                                ? 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-900'
                                : 'border border-slate-300 dark:border-slate-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:border-indigo-500 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs'
                            }`}
                            title={isSelected ? 'Deselect file' : 'Select file'}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          {/* Quick Actions (Download + More dropdown) */}
                          <div className="relative flex items-center gap-1">
                            <a
                              href={getFileDownloadUrl(file.id)}
                              download={file.name}
                              title="Download"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === file.id ? null : file.id);
                              }}
                              title="More options"
                              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                openMenuId === file.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Floating Dropdown Menu */}
                            {openMenuId === file.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-8 z-30 w-44 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 text-xs font-medium space-y-0.5"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setActivePreviewFile(file);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Preview File</span>
                                </button>
                                <a
                                  href={getFileDownloadUrl(file.id)}
                                  download={file.name}
                                  onClick={() => setOpenMenuId(null)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Download</span>
                                </a>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setRenameTarget({ id: file.id, name: file.name, type: 'file' });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setMoveTarget({ id: file.id, type: 'file' });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <FolderInput className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Move to Folder</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDetailsTargetFile(file);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>File Details</span>
                                </button>
                                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                <button
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    if (confirm(`Move file "${file.name}" to trash?`)) {
                                      await apiTrashFile(file.id);
                                      toast.success(`Moved "${file.name}" to trash`);
                                      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
                                      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
                                    }
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Move to Trash</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Body: Thumbnail Image or Filetype Preview Canvas */}
                        <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/60 mb-2.5 flex items-center justify-center relative border border-slate-100 dark:border-slate-800/40">
                          {isImage ? (
                            <img
                              src={getFileContentUrl(file.id)}
                              alt={file.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-slate-700/80 shadow-xs flex items-center justify-center">
                                {getFileIconLarge(file.extension)}
                              </div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                {file.extension || 'FILE'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Icon + Filename + Size & Date */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0">{getFileIcon(file.extension)}</span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </h4>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>{formatBytes(Number(file.size))}</span>
                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => setActivePreviewFile(file)}
                        className={`flex items-center justify-between p-3 sm:p-3.5 transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-4">
                          {/* File Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => toggleSelectFile(file.id, e)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : selectedCount > 0
                                ? 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                                : 'border border-slate-300 dark:border-slate-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:border-indigo-500'
                            }`}
                            title={isSelected ? 'Deselect file' : 'Select file'}
                            aria-label={isSelected ? 'Deselect file' : 'Select file'}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="shrink-0">{getFileIcon(file.extension)}</div>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-xs text-slate-400">
                          <span className="hidden sm:inline font-mono">{formatBytes(Number(file.size))}</span>
                          <span className="hidden md:inline">{new Date(file.createdAt).toLocaleDateString()}</span>

                          <div className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={getFileDownloadUrl(file.id)}
                              download={file.name}
                              title="Download"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === `list-${file.id}` ? null : `list-${file.id}`)}
                              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                openMenuId === `list-${file.id}` ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === `list-${file.id}` && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-8 z-30 w-44 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 text-xs font-medium space-y-0.5"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setActivePreviewFile(file);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setRenameTarget({ id: file.id, name: file.name, type: 'file' });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setMoveTarget({ id: file.id, type: 'file' });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <FolderInput className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Move</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDetailsTargetFile(file);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Details</span>
                                </button>
                                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                <button
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    if (confirm(`Move file "${file.name}" to trash?`)) {
                                      await apiTrashFile(file.id);
                                      toast.success(`Moved "${file.name}" to trash`);
                                      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
                                      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
                                    }
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Move to Trash</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {/* 1. New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreate={async (name) => {
          await apiCreateFolder(name, currentFolderId);
          toast.success(`Folder "${name}" created`);
          queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
          queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
        }}
      />

      {/* 2. Rename Modal */}
      {renameTarget && (
        <RenameModal
          isOpen={Boolean(renameTarget)}
          currentName={renameTarget.name}
          itemType={renameTarget.type}
          onClose={() => setRenameTarget(null)}
          onRename={async (newName) => {
            if (renameTarget.type === 'folder') {
              await apiRenameFolder(renameTarget.id, newName);
              queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
            } else {
              await apiRenameFile(renameTarget.id, newName);
              queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
            }
            toast.success(`Renamed to "${newName}"`);
          }}
        />
      )}

      {/* 3. Move Modal */}
      {moveTarget && (
        <MoveModal
          isOpen={Boolean(moveTarget)}
          itemId={moveTarget.id}
          itemType={moveTarget.type}
          currentFolderId={currentFolderId}
          onClose={() => setMoveTarget(null)}
          onMove={async (targetFolderId) => {
            if (moveTarget.type === 'folder') {
              await apiMoveFolder(moveTarget.id, targetFolderId);
              queryClient.invalidateQueries({ queryKey: ['folders'] });
            } else {
              await apiMoveFile(moveTarget.id, targetFolderId);
              queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
            }
            toast.success('Moved successfully');
          }}
        />
      )}

      {/* 4. File Details Modal */}
      {detailsTargetFile && (
        <FileDetailsModal
          file={detailsTargetFile}
          isOpen={Boolean(detailsTargetFile)}
          onClose={() => setDetailsTargetFile(null)}
        />
      )}

      {/* 5. Duplicate File Resolution Modal */}
      {duplicateResolution && (
        <DuplicateFileDialog
          isOpen={Boolean(duplicateResolution)}
          fileName={duplicateResolution.existingName}
          onReplace={() => {
            const { file, relativePath } = duplicateResolution;
            setDuplicateResolution(null);
            executeUpload(file, 'replace', relativePath);
          }}
          onKeepBoth={() => {
            const { file, relativePath } = duplicateResolution;
            setDuplicateResolution(null);
            executeUpload(file, 'keep_both', relativePath);
          }}
          onCancel={() => setDuplicateResolution(null)}
        />
      )}

      {/* 6. Upload Queue Progress Drawer */}
      <UploadQueueDrawer
        items={uploadQueue}
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        onClear={() => setUploadQueue([])}
      />

      {/* 7. Floating Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-200 select-none">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs font-semibold whitespace-nowrap">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-[11px] font-bold flex items-center justify-center text-white">
              {selectedCount}
            </span>
            <span>Selected</span>
          </div>

          <button
            onClick={handleDeleteSelected}
            disabled={isDeletingSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeletingSelected ? 'Deleting...' : 'Delete Selected'}</span>
          </button>

          <button
            onClick={handleClearSelection}
            title="Cancel selection"
            aria-label="Cancel selection"
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
