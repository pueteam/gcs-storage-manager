import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Button,
  Card,
  ListGroup,
  FileInput,
  Spinner,
  Table,
  TextInput,
  Select,
  Pagination,
  Modal,
  Toast,
  Breadcrumb,
  Progress,
  Tooltip,
} from 'flowbite-react';
import {
  HiOutlineDownload,
  HiOutlineTrash,
  HiCheck,
  HiCog,
  HiOutlineFolder,
  HiOutlineChevronLeft,
  HiOutlineInformationCircle,
  HiOutlineEye,
  HiOutlineSwitchHorizontal,
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import FolderTree from './FolderTree';

interface FileInfo {
  name: string;
  size: number;
  updated: string;
  isFolder: boolean;
  contentType?: string;
}

interface StorageManagerProps {
  config: { projectId: string; credentialsFile: string } | null;
}

const transitionStyles = `
  .fade-transition {
    transition: opacity 300ms ease-in-out, max-height 300ms ease-in-out;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
  }
  .fade-transition.show {
    opacity: 1;
    max-height: 1000px; /* Adjust this value based on your content */
  }
`;

function StorageManager({ config }: StorageManagerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [buckets, setBuckets] = useState<string[]>([]);
  const [filteredBuckets, setFilteredBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof FileInfo>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedFileInfo, setSelectedFileInfo] = useState<FileInfo | null>(
    null,
  );
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    contentType: string;
    data: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBucketList, setShowBucketList] = useState(true);
  const [bucketListVisible, setBucketListVisible] = useState(true);
  const [folderStructureVisible, setFolderStructureVisible] = useState(false);

  useEffect(() => {
    if (!config) {
      navigate('/');
      return;
    }

    const fetchBuckets = async () => {
      try {
        const bucketList =
          await window.electron.ipcRenderer.invoke('list-buckets');
        setBuckets(bucketList);
        setFilteredBuckets(bucketList);
      } catch (error) {
        console.error('Error fetching buckets:', error);
      }
    };

    fetchBuckets();
  }, [config, navigate]);

  useEffect(() => {
    const filtered = buckets.filter((bucket) =>
      bucket.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredBuckets(filtered);
  }, [searchTerm, buckets]);

  useEffect(() => {
    const handleDownloadProgress = ({
      filePath,
      progress,
    }: {
      filePath: string;
      progress: number;
    }) => {
      setDownloadProgress((prev) => ({ ...prev, [filePath]: progress }));
    };

    window.electron.ipcRenderer.on('download-progress', handleDownloadProgress);

    return () => {
      window.electron.ipcRenderer.removeListener(
        'download-progress',
        handleDownloadProgress,
      );
    };
  }, []);

  useEffect(() => {
    const handleUploadProgress = ({
      fileName,
      progress,
    }: {
      fileName: string;
      progress: number;
    }) => {
      if (!fileName) {
        return;
      }
      setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
    };

    window.electron.ipcRenderer.on('upload-progress', handleUploadProgress);

    return () => {
      window.electron.ipcRenderer.removeListener(
        'upload-progress',
        handleUploadProgress,
      );
    };
  }, []);

  const handleBucketSelect = async (bucketName: string) => {
    setSelectedBucket(bucketName);
    setCurrentPath('');
    setShowBucketList(false);
    await fetchFiles(bucketName, '');
  };

  useEffect(() => {
    if (showBucketList) {
      setBucketListVisible(true);
    } else {
      setTimeout(() => setBucketListVisible(false), 300); // Match this with your transition duration
    }
  }, [showBucketList]);

  useEffect(() => {
    if (selectedBucket && !showBucketList) {
      setFolderStructureVisible(true);
    } else {
      setTimeout(() => setFolderStructureVisible(false), 300);
    }
  }, [selectedBucket, showBucketList]);

  const toggleBucketList = () => {
    setShowBucketList((prev) => !prev);
  };

  const fetchFiles = async (bucketName: string, path: string) => {
    setIsLoading(true);
    try {
      const fileList: FileInfo[] = await window.electron.ipcRenderer.invoke(
        'list-files',
        bucketName,
        path ? `${path}/` : path,
      );
      setFiles(fileList);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath
      ? `${currentPath}/${folderName}`
      : `${folderName}`;
    setCurrentPath(newPath);
    fetchFiles(selectedBucket, newPath);
  };

  const handleBackClick = () => {
    const newPath = currentPath
      .substring(0, currentPath.length - 1)
      .split('/')
      .slice(0, -1)
      .join('/');
    setCurrentPath(newPath);
    fetchFiles(selectedBucket, newPath);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const destination = currentPath
        ? `${currentPath}/${file.name}`
        : file.name;

      try {
        await window.electron.ipcRenderer.invoke('upload-file', {
          bucketName: selectedBucket,
          filePath: file.path,
          destination,
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        // Optionally, show an error message to the user
      }
    }

    setIsUploading(false);
    fetchFiles(selectedBucket, currentPath);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadProgress({});
  };

  const handleFileDownload = async (fileName: string) => {
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      setDownloadProgress((prev) => ({ ...prev, [filePath]: 0 }));

      const path = await window.electron.ipcRenderer.invoke('download-file', {
        bucketName: selectedBucket,
        filePath,
      });

      console.log(`File downloaded to: ${path}`);
      setDownloadPath(path);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[filePath];
          return newProgress;
        });
      }, 5000);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      let filePath = currentPath
        ? `${currentPath}/${fileToDelete}`
        : fileToDelete;

      // Add a trailing slash if it's a folder
      const fileToDeleteObj = files.find((file) => file.name === fileToDelete);
      if (fileToDeleteObj && fileToDeleteObj.isFolder) {
        filePath += '/';
      }

      await window.electron.ipcRenderer.invoke('delete-file', {
        bucketName: selectedBucket,
        filePath,
      });
      setDeleteModalOpen(false);
      setFileToDelete(null);
      fetchFiles(selectedBucket, currentPath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const createFolder = async () => {
    setNewFolderModalOpen(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;

    try {
      const folderPath = currentPath
        ? `${currentPath}/${newFolderName}`
        : newFolderName;
      await window.electron.ipcRenderer.invoke('create-folder', {
        bucketName: selectedBucket,
        folderPath,
      });
      fetchFiles(selectedBucket, currentPath);
      setNewFolderModalOpen(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = currentPath.split('/').slice(0, index).join('/');
    setCurrentPath(newPath);
    fetchFiles(selectedBucket, newPath);
  };

  const handleFolderSelect = (path: string) => {
    setCurrentPath(path);
    fetchFiles(selectedBucket, path);
  };

  const refreshCurrentFolder = useCallback(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket, currentPath);
    }
  }, [selectedBucket, currentPath, fetchFiles]);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(
      Math.floor(Math.log(bytes) / Math.log(1024)).toString(),
      10,
    );
    return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`;
  };

  const sortedAndFilteredFiles = useMemo(() => {
    return files
      .filter((file) =>
        file.name.toLowerCase().includes(fileSearchTerm.toLowerCase()),
      )
      .sort((a, b) => {
        if (a[sortColumn] < b[sortColumn])
          return sortDirection === 'asc' ? -1 : 1;
        if (a[sortColumn] > b[sortColumn])
          return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [files, fileSearchTerm, sortColumn, sortDirection]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredFiles, currentPage, itemsPerPage]);

  const handleSort = (column: keyof FileInfo) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleConfigureClick = () => {
    navigate('/config');
  };

  const fetchFileDetails = async (fileName: string) => {
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const fileDetails = await window.electron.ipcRenderer.invoke(
        'get-file-details',
        {
          bucketName: selectedBucket,
          filePath,
        },
      );
      setSelectedFileInfo(fileDetails);
      setInfoModalOpen(true);
    } catch (error) {
      console.error('Error fetching file details:', error);
    }
  };

  const fetchFilePreview = async (fileName: string) => {
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const preview = await window.electron.ipcRenderer.invoke(
        'get-file-preview',
        {
          bucketName: selectedBucket,
          filePath,
        },
      );
      setPreviewData(preview);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('Error fetching file preview:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div
      className={`space-y-4 bg-white dark:bg-slate-800 ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Storage Manager</h1>
        <Button color="light" onClick={handleConfigureClick}>
          <HiCog className="mr-2 h-5 w-5" />
          Configure
        </Button>
      </div>
      <style>{transitionStyles}</style>
      <div className="grid grid-cols-4 gap-4">
        {bucketListVisible && (
          <Card
            className={`col-span-1 flex flex-col h-full ${
              showBucketList ? 'show' : ''
            }`}
          >
            <div className="flex-grow">
              <h2 className="text-xl font-semibold mb-2 dark:text-white">
                Buckets
              </h2>
              <TextInput
                type="text"
                placeholder="Search buckets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <div className="h-96 overflow-y-auto">
                <ListGroup>
                  {filteredBuckets.map((bucket) => (
                    <ListGroup.Item
                      key={bucket}
                      onClick={() => handleBucketSelect(bucket)}
                      className="cursor-pointer"
                      active={bucket === selectedBucket}
                    >
                      {bucket}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            </div>
          </Card>
        )}
        {folderStructureVisible && (
          <Card
            className={`col-span-1 fade-transition ${
              selectedBucket && !showBucketList ? 'show' : ''
            } h-full`}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold dark:text-white">
                Folder Structure
              </h2>
              <Button
                onClick={toggleBucketList}
                size="sm"
                color="gray"
                pill
                title="Change Bucket"
              >
                <HiOutlineSwitchHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <FolderTree
              bucketName={selectedBucket}
              onFolderSelect={handleFolderSelect}
              onFolderChange={refreshCurrentFolder}
            />
          </Card>
        )}
        <Card
          className={`${
            selectedBucket && !showBucketList ? 'col-span-3' : 'col-span-3'
          }`}
        >
          <div className="flex-grow overflow-y-auto">
            {selectedBucket && (
              <>
                <div className="mb-4">
                  <Breadcrumb>
                    <Breadcrumb.Item
                      href="#"
                      onClick={() => handleBreadcrumbClick(0)}
                    >
                      {selectedBucket}
                    </Breadcrumb.Item>
                    {currentPath.split('/').map((folder, index) => (
                      <Breadcrumb.Item
                        key={index}
                        href="#"
                        onClick={() => handleBreadcrumbClick(index + 1)}
                      >
                        {folder}
                      </Breadcrumb.Item>
                    ))}
                  </Breadcrumb>
                  {/*
                    isLoading && (
                    <div className="flex items-center">
                      <Spinner size="sm" />
                      <span className="ml-2">Loading...</span>
                    </div>
                  )
                  */}
                </div>
                <div className="flex justify-between mb-4">
                  {currentPath && (
                    <Button color="light" onClick={handleBackClick}>
                      <HiOutlineChevronLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                  )}
                  <Button color="light" onClick={createFolder}>
                    <HiOutlineFolder className="mr-2 h-5 w-5 text-yellow-500" />
                    New Folder
                  </Button>
                </div>
                <div className="mb-4 flex justify-between items-center">
                  <TextInput
                    type="text"
                    placeholder="Search files..."
                    value={fileSearchTerm}
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    className="w-1/2"
                  />
                  <div className="flex items-center">
                    <span className="mr-2 dark:text-white">
                      Items per page:
                    </span>
                    <Select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </Select>
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Spinner size="xl" />
                  </div>
                ) : (
                  <Table>
                    <Table.Head>
                      <Table.HeadCell
                        onClick={() => handleSort('name')}
                        className="cursor-pointer"
                      >
                        File Name{' '}
                        {sortColumn === 'name' &&
                          (sortDirection === 'asc' ? '↑' : '↓')}
                      </Table.HeadCell>
                      <Table.HeadCell
                        onClick={() => handleSort('size')}
                        className="cursor-pointer"
                      >
                        Size{' '}
                        {sortColumn === 'size' &&
                          (sortDirection === 'asc' ? '↑' : '↓')}
                      </Table.HeadCell>
                      <Table.HeadCell
                        onClick={() => handleSort('updated')}
                        className="cursor-pointer"
                      >
                        Last Modified{' '}
                        {sortColumn === 'updated' &&
                          (sortDirection === 'asc' ? '↑' : '↓')}
                      </Table.HeadCell>
                      <Table.HeadCell>Actions</Table.HeadCell>
                    </Table.Head>
                    <Table.Body className="divide-y">
                      {paginatedFiles.map((file) => (
                        <Table.Row
                          key={file.name}
                          className="bg-white dark:border-gray-700 dark:bg-gray-800"
                        >
                          <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {file.isFolder ? (
                              <button
                                onClick={() => handleFolderClick(file.name)}
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                <HiOutlineFolder className="mr-2 h-5 w-5 text-yellow-500" />
                                {file.name}
                              </button>
                            ) : (
                              file.name
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {file.isFolder ? '-' : formatFileSize(file.size)}
                          </Table.Cell>
                          <Table.Cell>
                            {file.isFolder
                              ? '-'
                              : new Date(file.updated).toLocaleString()}
                          </Table.Cell>
                          <Table.Cell>
                            {downloadProgress[file.name] !== undefined ? (
                              <div className="w-full">
                                <Progress
                                  progress={downloadProgress[file.name]}
                                  size="lg"
                                  labelProgress
                                />
                              </div>
                            ) : (
                              ''
                            )}
                            <div className="flex items-center space-x-2">
                              <Tooltip content="Download">
                                <button
                                  onClick={() => handleFileDownload(file.name)}
                                  className="text-gray-500 hover:text-blue-600"
                                >
                                  <HiOutlineDownload className="h-5 w-5" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Delete">
                                <button
                                  onClick={() => {
                                    setFileToDelete(file.name);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="text-gray-500 hover:text-red-600"
                                >
                                  <HiOutlineTrash className="h-5 w-5" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Info">
                                <button
                                  onClick={() =>
                                    !file.isFolder &&
                                    fetchFileDetails(file.name)
                                  }
                                  className="text-gray-500 hover:text-green-600 transition-all duration-200 ease-in-out hover:scale-110"
                                  disabled={file.isFolder}
                                >
                                  <HiOutlineInformationCircle className="h-5 w-5" />
                                </button>
                              </Tooltip>
                              {!file.isFolder &&
                                (file.name.endsWith('.pdf') ||
                                  file.name.match(/\.(jpe?g|png|gif)$/i)) && (
                                  <Tooltip content="Preview">
                                    <button
                                      onClick={() =>
                                        fetchFilePreview(file.name)
                                      }
                                      className="text-gray-500 hover:text-purple-600 transition-all duration-200 ease-in-out hover:scale-110"
                                    >
                                      <HiOutlineEye className="h-5 w-5" />
                                    </button>
                                  </Tooltip>
                                )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                )}
                <div className="flex items-center justify-between mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(
                      sortedAndFilteredFiles.length / itemsPerPage,
                    )}
                    onPageChange={setCurrentPage}
                    showIcons
                  />
                  <div className="dark:text-white">
                    Showing {paginatedFiles.length} of{' '}
                    {sortedAndFilteredFiles.length} files
                  </div>
                </div>
                <div className="mt-4">
                  <FileInput
                    ref={fileInputRef}
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    helperText="Choose files to upload"
                  />
                  {isUploading && (
                    <div className="mt-2">
                      {Object.entries(uploadProgress).map(
                        ([fileName, progress]) => (
                          <div key={fileName} className="mb-2">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {fileName}
                              </span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {progress}%
                              </span>
                            </div>
                            <Progress
                              progress={progress}
                              size="sm"
                              color="blue"
                            />
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header>Confirm Deletion</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
              Are you sure you want to delete the file "{fileToDelete}"? This
              action cannot be undone.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleDeleteFile} color="failure">
            Yes, Delete File
          </Button>
          <Button color="gray" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
      >
        <Modal.Header>Create New Folder</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <TextInput
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCreateFolder}>Create Folder</Button>
          <Button color="gray" onClick={() => setNewFolderModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <Modal.Header>File Information</Modal.Header>
        <Modal.Body>
          {selectedFileInfo && (
            <Table>
              <Table.Body>
                <Table.Row>
                  <Table.Cell className="font-medium">Name</Table.Cell>
                  <Table.Cell>{selectedFileInfo.name}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="font-medium">Type</Table.Cell>
                  <Table.Cell>
                    {selectedFileInfo.isFolder ? 'Folder' : 'File'}
                  </Table.Cell>
                </Table.Row>
                {!selectedFileInfo.isFolder && (
                  <>
                    <Table.Row>
                      <Table.Cell className="font-medium">Size</Table.Cell>
                      <Table.Cell>
                        {formatFileSize(selectedFileInfo.size)}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="font-medium">
                        Last Modified
                      </Table.Cell>
                      <Table.Cell>
                        {new Date(selectedFileInfo.updated).toLocaleString()}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="font-medium">MIME Type</Table.Cell>
                      <Table.Cell>
                        {selectedFileInfo.contentType || 'N/A'}
                      </Table.Cell>
                    </Table.Row>
                  </>
                )}
              </Table.Body>
            </Table>
          )}
        </Modal.Body>
      </Modal>
      <Modal
        size="xl"
        show={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
      >
        <Modal.Header>File Preview</Modal.Header>
        <Modal.Body>
          {previewData && (
            <div className="flex justify-center">
              {previewData.contentType.startsWith('image/') ? (
                <img
                  src={`data:${previewData.contentType};base64,${previewData.data}`}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : previewData.contentType === 'application/pdf' ? (
                <iframe
                  src={`data:application/pdf;base64,${previewData.data}`}
                  width="100%"
                  height="600px"
                  title="PDF Preview"
                />
              ) : (
                <p>Preview not available for this file type.</p>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
      {showToast && (
        <Toast className="fixed bottom-5 right-5">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">
            File downloaded to: {downloadPath}
          </div>
          <Toast.Toggle onDismiss={() => setShowToast(false)} />
        </Toast>
      )}
    </div>
  );
}

export default StorageManager;
