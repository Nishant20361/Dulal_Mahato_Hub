import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function NewFolderModal({ isOpen, onClose, onCreate }: NewFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onCreate(folderName.trim());
      setFolderName('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Folder"
      description="Enter a name for the new folder"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          placeholder="Folder Name (e.g. Semester 3, Java, Assignments)"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          error={error}
          disabled={isLoading}
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            Create Folder
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
