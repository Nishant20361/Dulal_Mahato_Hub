import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { DriveFile } from '@/lib/api';
import { FilePreviewModal } from '../drive/FilePreviewModal';

export interface AppOutletContext {
  setActivePreviewFile: (file: DriveFile | null) => void;
  setUploadingCount: React.Dispatch<React.SetStateAction<number>>;
}

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<DriveFile | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              onNavigate={() => setIsMobileMenuOpen(false)}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          uploadingCount={uploadingCount}
          onSelectFile={(file) => setActivePreviewFile(file)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <Outlet context={{ setActivePreviewFile, setUploadingCount }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global File Preview Modal */}
      {activePreviewFile && (
        <FilePreviewModal
          file={activePreviewFile}
          isOpen={Boolean(activePreviewFile)}
          onClose={() => setActivePreviewFile(null)}
        />
      )}
    </div>
  );
}
