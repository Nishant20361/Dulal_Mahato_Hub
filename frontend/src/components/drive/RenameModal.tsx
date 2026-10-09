import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  itemType: 'file' | 'folder';
  onRename: (newName: string) => Promise<void>;
}

export function RenameModal({
  isOpen,
  onClose,
  currentName,
  itemType,
  onRename,
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(currentName);
    setError('');
  }, [currentName, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onRename(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to rename');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Rename ${itemType === 'file' ? 'File' : 'Folder'}`}
      description="Enter the new name for this item"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          disabled={isLoading}
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            Rename
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
