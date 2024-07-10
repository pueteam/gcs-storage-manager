import React, { useState, useRef, useEffect } from 'react';
import { Button, Progress } from 'flowbite-react';
import { HiOutlineUpload } from 'react-icons/hi';
import { IpcRendererEvent } from 'electron';

interface FileUploadProps {
  bucketName: string;
  currentPath: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadProgressData {
  fileName: string;
  progress: number;
}

function FileUpload({
  bucketName,
  currentPath,
  onClose,
  onUploadComplete,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleProgress = (
      _event: IpcRendererEvent,
      { fileName, progress }: UploadProgressData,
    ) => {
      setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
    };

    window.electron.ipcRenderer.on<UploadProgressData>(
      'upload-progress',
      handleProgress,
    );

    return () => {
      window.electron.ipcRenderer.removeListener(
        'upload-progress',
        handleProgress,
      );
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    const uploadPromises = selectedFiles.map(async (file) => {
      const destination = currentPath
        ? `${currentPath}/${file.name}`
        : file.name;

      try {
        await window.electron.ipcRenderer.invoke('upload-file', {
          bucketName,
          filePath: file.path,
          destination,
        });

        return file.name;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        return null;
      }
    });

    try {
      await Promise.all(uploadPromises);
      alert('All files uploaded successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Error during file upload:', error);
      alert('Some files failed to upload. Please try again.');
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        ref={fileInputRef}
        disabled={isUploading}
      />
      {selectedFiles.length > 0 && (
        <div>
          <p className="dark:text-slate-400">Selected files:</p>
          <ul className="list-disc list-inside dark:text-slate-400">
            {selectedFiles.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      {isUploading && (
        <div>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="mb-2">
              <p>{fileName}</p>
              <Progress progress={progress} size="sm" color="blue" />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <Button color="gray" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          color="blue"
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
        >
          <HiOutlineUpload className="mr-2 h-5 w-5" />
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </div>
    </div>
  );
}

export default FileUpload;
