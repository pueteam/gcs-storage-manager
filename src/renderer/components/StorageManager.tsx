import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Button,
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
  Checkbox,
} from 'flowbite-react';
import {
  HiOutlineDownload,
  HiOutlineTrash,
  HiCheck,
  HiOutlineFolder,
  HiOutlineInformationCircle,
  HiOutlineEye,
} from 'react-icons/hi';
import { IpcRendererEvent } from 'electron';
import { useTheme } from '../ThemeContext';
import BulkUpload from './BulkUpload';
import FileUpload from './FileUpload';
import ActionButtons from './ActionButtons';

interface FileInfo {
  name: string;
  size: number;
  updated: string;
  isFolder: boolean;
  contentType?: string;
}

interface StorageManagerProps {
  selectedBucket: string;
  currentPath: string;
  refreshTrigger: number;
  onFolderSelect: (path: string) => void;
  onFolderChange: () => void;
}

interface DownloadProgressData {
  filePath: string;
  progress: number;
}

function StorageManager({
  selectedBucket,
  currentPath,
  refreshTrigger,
  onFolderSelect,
  onFolderChange,
}: StorageManagerProps) {
  const { theme } = useTheme();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof FileInfo>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');
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
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleSelectFile = (fileName: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((file) => file.name)));
    }
  };

  const handleDownloadProgress = useCallback(
    (
      _event: IpcRendererEvent,
      { filePath, progress }: DownloadProgressData,
    ) => {
      setDownloadProgress((prev) => ({ ...prev, [filePath]: progress }));
    },
    [],
  );
  useEffect(() => {
    const removeDownloadListener =
      window.electron.ipcRenderer.on<DownloadProgressData>(
        'download-progress',
        handleDownloadProgress,
      );

    return () => {
      removeDownloadListener();
    };
  }, [handleDownloadProgress]);

  const fetchFiles = useCallback(async (bucketName: string, path: string) => {
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
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket, currentPath);
    }
  }, [selectedBucket, currentPath, fetchFiles, refreshTrigger]);

  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket, currentPath);
    }
  }, [selectedBucket, currentPath, refreshTrigger, fetchFiles]);

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath
      ? `${currentPath}/${folderName}`
      : `${folderName}`;
    onFolderSelect(newPath);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} file(s)?`,
    );
    if (!confirmDelete) return;

    try {
      const deletePromises = Array.from(selectedFiles).map((fileName) => {
        const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
        return window.electron.ipcRenderer.invoke('delete-file', {
          bucketName: selectedBucket,
          filePath,
        });
      });

      await Promise.all(deletePromises);

      setSelectedFiles(new Set());
      fetchFiles(selectedBucket, currentPath);
      alert('Selected files deleted successfully');
    } catch (error) {
      console.error('Error deleting files:', error);
      alert('An error occurred while deleting files');
    }
  };

  const handleBackClick = () => {
    const newPath = currentPath
      .substring(0, currentPath.length - 1)
      .split('/')
      .slice(0, -1)
      .join('/');
    onFolderSelect(newPath);
  };

  const showNotification = useCallback((title: string, body: string) => {
    const CLICK_MESSAGE = 'Notification clicked';

    new Notification(title, { body }).onclick = () =>
      console.warn(CLICK_MESSAGE);
  }, []);

  const handleFileDownload = async (fileName: string) => {
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      setDownloadProgress((prev) => ({ ...prev, [filePath]: 0 }));

      const downloadedPath = await window.electron.ipcRenderer.invoke(
        'download-file',
        {
          bucketName: selectedBucket,
          filePath,
        },
      );

      setDownloadPath(downloadedPath);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[filePath];
          return newProgress;
        });
      }, 3000);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const downloadPromises = Array.from(selectedFiles).map((fileName) => {
        return handleFileDownload(fileName);
      });

      await Promise.all(downloadPromises);

      setSelectedFiles(new Set());
      alert('Selected files downloaded successfully');
    } catch (error) {
      console.error('Error downloading files:', error);
      alert('An error occurred while downloading files');
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
      onFolderChange();
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
      onFolderChange();
      // Show a success notification
      showNotification(
        'Folder Created',
        `Folder "${newFolderName}" has been created successfully.`,
      );
    } catch (error) {
      console.error('Error creating folder:', error);
      showNotification(
        'Error',
        `Failed to create folder "${newFolderName}". Please try again.`,
      );
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = currentPath.split('/').slice(0, index).join('/');
    onFolderSelect(newPath);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(
      Math.floor(Math.log(bytes) / Math.log(1024)).toString(),
      10,
    );
    return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`;
  };

  type SortColumn = keyof FileInfo;

  const sortedAndFilteredFiles = useMemo(() => {
    return files
      .filter((file) =>
        file.name.toLowerCase().includes(fileSearchTerm.toLowerCase()),
      )
      .sort((a, b) => {
        const aValue = a[sortColumn as SortColumn];
        const bValue = b[sortColumn as SortColumn];

        if (aValue === undefined || bValue === undefined) {
          return 0; // Handle cases where the property might not exist
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
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

  const renderPreviewContent = (pvData: {
    contentType: string;
    data: string;
  }) => {
    if (pvData.contentType.startsWith('image/')) {
      return (
        <img
          src={`data:${pvData.contentType};base64,${pvData.data}`}
          alt="Preview"
          className="max-w-full max-h-[70vh] object-contain"
        />
      );
    }

    if (pvData.contentType === 'application/pdf') {
      return (
        <iframe
          src={`data:application/pdf;base64,${pvData.data}`}
          width="100%"
          height="600px"
          title="PDF Preview"
        />
      );
    }

    return <p>Preview not available for this file type.</p>;
  };

  const renderFileActions = (file: FileInfo) => {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const progress = downloadProgress[filePath];

    if (progress !== undefined) {
      return (
        <div className="w-full">
          <Progress progress={progress} size="sm" color="blue" />
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <Tooltip content="Download">
          <button
            type="button"
            onClick={() => handleFileDownload(file.name)}
            className="text-gray-500 hover:text-blue-600 transition-all duration-200 ease-in-out hover:scale-110"
          >
            <HiOutlineDownload className="h-5 w-5" />
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            type="button"
            onClick={() => {
              setFileToDelete(file.name);
              setDeleteModalOpen(true);
            }}
            className="text-gray-500 hover:text-red-600 transition-all duration-200 ease-in-out hover:scale-110"
          >
            <HiOutlineTrash className="h-5 w-5" />
          </button>
        </Tooltip>
        <Tooltip content="Info">
          <button
            type="button"
            onClick={() => !file.isFolder && fetchFileDetails(file.name)}
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
                type="button"
                onClick={() => fetchFilePreview(file.name)}
                className="text-gray-500 hover:text-purple-600 transition-all duration-200 ease-in-out hover:scale-110"
              >
                <HiOutlineEye className="h-5 w-5" />
              </button>
            </Tooltip>
          )}
      </div>
    );
  };

  return (
    <div
      className={`space-y-4 bg-white dark:bg-slate-800 ${
        theme === 'dark' ? 'dark' : ''
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
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    href="#"
                    onClick={() => handleBreadcrumbClick(index + 1)}
                  >
                    {folder}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </div>
            <div className="flex justify-between mb-4">
              <ActionButtons
                currentPath={currentPath}
                handleBackClick={handleBackClick}
                createFolder={createFolder}
                setFileUploadModalOpen={setFileUploadModalOpen}
                setBulkUploadModalOpen={setBulkUploadModalOpen}
                handleBulkDelete={handleBulkDelete}
                handleBulkDownload={handleBulkDownload}
                selectedFilesCount={selectedFiles.size}
              />
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
                <span className="mr-2 dark:text-white">Items per page:</span>
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
                  <Table.HeadCell>
                    <Checkbox
                      checked={
                        selectedFiles.size === files.length &&
                        files.length !== 0
                      }
                      onChange={handleSelectAll}
                    />
                  </Table.HeadCell>
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
                      <Table.Cell>
                        <Checkbox
                          checked={selectedFiles.has(file.name)}
                          onChange={() => handleSelectFile(file.name)}
                        />
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {file.isFolder ? (
                          <button
                            type="button"
                            onClick={() => handleFolderClick(file.name)}
                            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
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
                      <Table.Cell>{renderFileActions(file)}</Table.Cell>
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
          </>
        )}
      </div>
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header>Confirm Deletion</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
              Are you sure you want to delete the file &quot;{fileToDelete}
              &quot;? This action cannot be undone.
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
              {renderPreviewContent(previewData)}
            </div>
          )}
        </Modal.Body>
      </Modal>
      <Modal
        show={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        size="lg"
      >
        <Modal.Header>Bulk Upload</Modal.Header>
        <Modal.Body>
          <BulkUpload
            bucketName={selectedBucket}
            currentPath={currentPath}
            onClose={() => setBulkUploadModalOpen(false)}
            onUploadComplete={() => {
              setBulkUploadModalOpen(false);
              onFolderChange(); // Refresh the file list after upload
            }}
          />
        </Modal.Body>
      </Modal>
      <Modal
        show={fileUploadModalOpen}
        onClose={() => setFileUploadModalOpen(false)}
        size="lg"
      >
        <Modal.Header>Upload Files</Modal.Header>
        <Modal.Body>
          <FileUpload
            bucketName={selectedBucket}
            currentPath={currentPath}
            onClose={() => setFileUploadModalOpen(false)}
            onUploadComplete={() => {
              setFileUploadModalOpen(false);
              onFolderChange(); // Refresh the file list after upload
            }}
          />
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
