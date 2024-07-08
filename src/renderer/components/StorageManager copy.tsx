import React, { useState, useEffect } from 'react';
import { Button, Card, ListGroup, FileInput, Spinner } from 'flowbite-react';

interface StorageManagerProps {
  config: { projectId: string; credentialsFile: string };
}

//const StorageManager: React.FC<StorageManagerProps> = ({ config }) => {
function StorageManager({ config }: StorageManagerProps) {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const bucketList = await window.electron.ipcRenderer.invoke(
          'list-buckets',
          config,
        );
        console.log(bucketList);
        // const [bucketList] = await storage.getBuckets();
        // setBuckets(bucketList.map((bucket) => bucket.name));
        setBuckets(bucketList);
      } catch (error) {
        console.error('Error fetching buckets:', error);
      }
    };

    fetchBuckets();
  }, [config]);

  const handleBucketSelect = async (bucketName: string) => {
    setSelectedBucket(bucketName);
    const storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentialsFile,
    });

    try {
      const [fileList] = await storage.bucket(bucketName).getFiles();
      setFiles(fileList.map((file) => file.name));
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentialsFile,
    });

    try {
      await storage.bucket(selectedBucket).upload(file.path, {
        destination: file.name,
      });
      handleBucketSelect(selectedBucket); // Refresh file list
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (fileName: string) => {
    const storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentialsFile,
    });

    try {
      const [fileContents] = await storage
        .bucket(selectedBucket)
        .file(fileName)
        .download();

      // Create a Blob from the file contents
      const blob = new Blob([fileContents], {
        type: 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Storage Manager</h1>
      <Card>
        <h2 className="text-xl font-semibold mb-2">Buckets</h2>
        <ListGroup>
          {buckets.map((bucket) => (
            <ListGroup.Item
              key={bucket}
              onClick={() => handleBucketSelect(bucket)}
              className="cursor-pointer"
            >
              {bucket}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
      {selectedBucket && (
        <Card>
          <h2 className="text-xl font-semibold mb-2">
            Files in {selectedBucket}
          </h2>
          <ListGroup>
            {files.map((file) => (
              <ListGroup.Item
                key={file}
                className="flex justify-between items-center"
              >
                <span>{file}</span>
                <Button size="sm" onClick={() => handleFileDownload(file)}>
                  Download
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <div className="mt-4">
            <FileInput
              onChange={handleFileUpload}
              disabled={uploading}
              helperText="Choose a file to upload"
            />
            {uploading && <Spinner aria-label="Uploading..." />}
          </div>
        </Card>
      )}
    </div>
  );
}

export default StorageManager;
