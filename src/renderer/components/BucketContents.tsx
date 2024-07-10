import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card } from 'flowbite-react';
import { HiOutlineChevronLeft, HiCog } from 'react-icons/hi';
import FolderTree from './FolderTree';
import StorageManager from './StorageManager';

function BucketContents() {
  const { bucketName } = useParams<{ bucketName: string }>();
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [, setSelectedFolder] = useState('');

  const handleFolderSelect = (path: string) => {
    setCurrentPath(path);
    setSelectedFolder(path);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleFolderChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleBackClick = () => {
    navigate('/');
  };

  const handleConfigureClick = () => {
    navigate('/config');
  };

  if (!bucketName) {
    return <div>No bucket selected</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold dark:text-white">
          Bucket: {bucketName}
        </h1>
        <div className="flex space-x-2">
          <Button color="light" onClick={handleBackClick}>
            <HiOutlineChevronLeft className="mr-2 h-5 w-5" />
            Back to Buckets
          </Button>
          <Button color="light" onClick={handleConfigureClick}>
            <HiCog className="mr-2 h-5 w-5" />
            Configure
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-1">
          <h2 className="text-xl font-semibold mb-2 dark:text-white">
            Folder Structure
          </h2>
          <FolderTree
            bucketName={bucketName}
            onFolderSelect={handleFolderSelect}
            onFolderChange={handleFolderChange}
            selectedFolder={currentPath}
            refreshTrigger={refreshTrigger}
          />
        </Card>
        <Card className="col-span-3">
          <StorageManager
            selectedBucket={bucketName}
            currentPath={currentPath}
            refreshTrigger={refreshTrigger}
            onFolderSelect={handleFolderSelect}
            onFolderChange={handleFolderChange}
          />
        </Card>
      </div>
    </div>
  );
}

export default BucketContents;
