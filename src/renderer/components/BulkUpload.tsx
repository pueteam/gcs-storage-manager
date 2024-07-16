import React, { useState, useEffect, useCallback } from 'react';
import { Button, TextInput, Progress } from 'flowbite-react';
import { HiOutlineFolder } from 'react-icons/hi';
import { IpcRendererEvent } from 'electron';

interface BulkUploadProps {
  bucketName: string;
  currentPath: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

function BulkUpload({
  bucketName,
  currentPath,
  onClose,
  onUploadComplete,
}: BulkUploadProps) {
  const [localDirectory, setLocalDirectory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressListener = useCallback(
    (_event: IpcRendererEvent, progressData: number) => {
      setProgress(progressData);
    },
    [],
  );

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'bulk-upload-progress',
      progressListener,
    );

    return () => {
      removeListener();
    };
  }, [progressListener]);

  const handleDirectorySelect = async () => {
    const result = await window.electron.ipcRenderer.invoke('select-directory');
    if (result) {
      setLocalDirectory(result);
    }
  };

  const handleUpload = async () => {
    if (!localDirectory) {
      alert('Please select a directory first.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      await window.electron.ipcRenderer.invoke('bulk-upload', {
        bucketName,
        localDirectory,
        destination: currentPath,
      });

      await new Promise<void>((resolve) => {
        window.electron.ipcRenderer.once('bulk-upload-complete', () => {
          resolve();
        });
      });

      alert('Bulk upload completed successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Bulk upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <TextInput
          type="text"
          value={localDirectory}
          onChange={(e) => setLocalDirectory(e.target.value)}
          placeholder="Select local directory"
          className="flex-grow mr-2"
          disabled={isUploading}
        />
        <Button onClick={handleDirectorySelect} disabled={isUploading}>
          <HiOutlineFolder className="mr-2 h-5 w-5" />
          Browse
        </Button>
      </div>
      {isUploading ? (
        <Progress progress={progress} color="blue" size="lg" labelProgress />
      ) : (
        <div className="flex justify-end space-x-2">
          <Button color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleUpload}
            disabled={!localDirectory}
          >
            Start Upload
          </Button>
        </div>
      )}
    </div>
  );
}

export default BulkUpload;
