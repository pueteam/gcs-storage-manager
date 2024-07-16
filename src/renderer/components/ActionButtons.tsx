import React, { useState } from 'react';
import { Button, Dropdown } from 'flowbite-react';
import {
  HiOutlineChevronLeft,
  HiOutlineFolder,
  HiOutlineUpload,
  HiOutlineDocumentAdd,
  HiOutlineTrash,
  HiOutlineDownload,
  HiOutlineDotsVertical,
} from 'react-icons/hi';

interface ActionButtonsProps {
  currentPath: string;
  handleBackClick: () => void;
  createFolder: () => void;
  setFileUploadModalOpen: (open: boolean) => void;
  setBulkUploadModalOpen: (open: boolean) => void;
  handleBulkDelete: () => void;
  handleBulkDownload: () => void;
  selectedFilesCount: number;
}

function ActionButtons({
  currentPath,
  handleBackClick,
  createFolder,
  setFileUploadModalOpen,
  setBulkUploadModalOpen,
  handleBulkDelete,
  handleBulkDownload,
  selectedFilesCount,
}: ActionButtonsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="flex items-center space-x-2 mb-4">
      {currentPath && (
        <Button color="light" size="sm" onClick={handleBackClick}>
          <HiOutlineChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      )}
      <Button color="light" size="sm" onClick={createFolder}>
        <HiOutlineFolder className="mr-1 h-4 w-4 text-yellow-500" />
        New Folder
      </Button>
      <Button
        color="light"
        size="sm"
        onClick={() => setFileUploadModalOpen(true)}
      >
        <HiOutlineDocumentAdd className="mr-1 h-4 w-4 text-green-500" />
        Upload Files
      </Button>
      <Button
        color="light"
        size="sm"
        onClick={() => setBulkUploadModalOpen(true)}
      >
        <HiOutlineUpload className="mr-1 h-4 w-4 text-blue-500" />
        Bulk Upload
      </Button>
      <Dropdown
        label={<HiOutlineDotsVertical className="h-4 w-4" />}
        arrowIcon={false}
        color="light"
        size="sm"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        onBlur={() => setIsDropdownOpen(false)}
        className={isDropdownOpen ? 'visible' : ''}
      >
        <Dropdown.Item
          icon={HiOutlineTrash}
          onClick={handleBulkDelete}
          disabled={selectedFilesCount === 0}
        >
          Delete Selected ({selectedFilesCount})
        </Dropdown.Item>
        <Dropdown.Item
          icon={HiOutlineDownload}
          onClick={handleBulkDownload}
          disabled={selectedFilesCount === 0}
        >
          Download Selected ({selectedFilesCount})
        </Dropdown.Item>
      </Dropdown>
    </div>
  );
}

export default ActionButtons;
