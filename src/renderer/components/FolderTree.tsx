import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineFolder,
  HiChevronRight,
  HiChevronDown,
  HiSearch,
  HiPlus,
  HiPencil,
  HiTrash,
  HiOutlineChevronDoubleDown,
  HiOutlineChevronDoubleUp,
} from 'react-icons/hi';
import { Button, TextInput, Modal, Tooltip, Spinner } from 'flowbite-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
}

function ContextMenu({
  x,
  y,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: ContextMenuProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 1000,
      }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg"
    >
      <ul className="py-1">
        <li>
          <button
            onClick={onCreateFolder}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <HiPlus className="mr-2" /> Create Folder
          </button>
        </li>
        <li>
          <button
            onClick={onRenameFolder}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <HiPencil className="mr-2" /> Rename Folder
          </button>
        </li>
        <li>
          <button
            onClick={onDeleteFolder}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <HiTrash className="mr-2" /> Delete Folder
          </button>
        </li>
      </ul>
    </div>
  );
}

interface FolderTreeProps {
  bucketName: string;
  onFolderSelect: (path: string) => void;
  onFolderChange: () => void;
}

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

function FolderTree({
  bucketName,
  onFolderSelect,
  onFolderChange,
}: FolderTreeProps) {
  const [folderStructure, setFolderStructure] = useState<FolderNode | null>(
    null,
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFolderStructure();
  }, [bucketName]);

  const fetchFolderStructure = async () => {
    setIsLoading(true); // Set loading to true when fetching starts
    try {
      const structure = await window.electron.ipcRenderer.invoke(
        'get-folder-structure',
        { bucketName },
      );
      setFolderStructure(structure);
    } catch (error) {
      console.error('Error fetching folder structure:', error);
    } finally {
      setIsLoading(false); // Set loading to false when fetching ends
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (folderStructure) {
      const allPaths = getAllPaths(folderStructure);
      setExpandedFolders(new Set(allPaths));
    }
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const getAllPaths = (node: FolderNode): string[] => {
    let paths = [node.path];
    node.children.forEach((child) => {
      paths = [...paths, ...getAllPaths(child)];
    });
    return paths;
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const folderMatchesSearch = useCallback(
    (folder: FolderNode): boolean => {
      if (folder.name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return folder.children.some((child) => folderMatchesSearch(child));
    },
    [searchTerm],
  );

  const handleContextMenu = (event: React.MouseEvent, path: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, path });
    setSelectedFolderPath(path);
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  const openCreateModal = () => {
    setNewFolderName('');
    setCreateModalOpen(true);
    closeContextMenu();
  };

  const openRenameModal = () => {
    setNewFolderName('');
    setRenameModalOpen(true);
    closeContextMenu();
  };

  const openDeleteModal = () => {
    setDeleteModalOpen(true);
    closeContextMenu();
  };

  const handleCreateFolder = () => {
    openCreateModal();
    closeContextMenu();
  };

  const handleRenameFolder = () => {
    openRenameModal();
    closeContextMenu();
  };

  const handleDeleteFolder = () => {
    openDeleteModal();
    closeContextMenu();
  };

  const createFolder = async () => {
    if (newFolderName) {
      setIsLoading(true);
      try {
        await window.electron.ipcRenderer.invoke('create-folder-tree', {
          bucketName,
          path: `${selectedFolderPath}/${newFolderName}`,
        });
        await fetchFolderStructure();
        setCreateModalOpen(false);
        onFolderChange();
      } catch (error) {
        console.error('Error creating folder:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renameFolder = async () => {
    if (newFolderName) {
      try {
        setIsLoading(true);
        await window.electron.ipcRenderer.invoke('rename-folder', {
          bucketName,
          oldPath: selectedFolderPath,
          newName: newFolderName,
        });
        fetchFolderStructure();
        setRenameModalOpen(false);
        onFolderChange();
      } catch (error) {
        console.error('Error renaming folder:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const deleteFolder = async () => {
    try {
      setIsLoading(true);
      await window.electron.ipcRenderer.invoke('delete-folder', {
        bucketName,
        path: selectedFolderPath,
      });
      fetchFolderStructure();
      setDeleteModalOpen(false);
      onFolderChange();
    } catch (error) {
      console.error('Error deleting folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFolder = useCallback(
    (folder: FolderNode, level: number = 0): React.ReactNode => {
      const isExpanded = expandedFolders.has(folder.path);
      const matchesSearch = folderMatchesSearch(folder);

      if (searchTerm && !matchesSearch) {
        return null;
      }

      return (
        <div key={folder.path}>
          <div
            className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
            style={{ marginLeft: `${level * 20}px` }}
            onClick={() => {
              toggleFolder(folder.path);
              onFolderSelect(folder.path);
            }}
            onContextMenu={(e) => handleContextMenu(e, folder.path)}
          >
            {folder.children.length > 0 ? (
              isExpanded ? (
                <HiChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <HiChevronRight className="w-5 h-5 text-gray-500" />
              )
            ) : (
              <span className="w-5" />
            )}
            <HiOutlineFolder className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm">{folder.name}</span>
          </div>
          {(isExpanded || searchTerm) &&
            folder.children.map((child) => renderFolder(child, level + 1))}
        </div>
      );
    },
    [
      expandedFolders,
      searchTerm,
      toggleFolder,
      onFolderSelect,
      handleContextMenu,
      folderMatchesSearch,
    ],
  );

  return (
    <div className="folder-tree h-full flex flex-col">
      <div className="mb-4 flex items-center">
        <TextInput
          type="text"
          placeholder="Search folders..."
          value={searchTerm}
          onChange={handleSearch}
          icon={HiSearch}
          className="flex-grow"
        />
        <div className="flex ml-2">
          <Tooltip content="Expand All">
            <Button size="sm" color="gray" onClick={expandAll} className="p-2">
              <HiOutlineChevronDoubleDown className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Collapse All">
            <Button
              size="sm"
              color="gray"
              onClick={collapseAll}
              className="p-2 ml-1"
            >
              <HiOutlineChevronDoubleUp className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex-grow overflow-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75">
            <Spinner size="xl" />
          </div>
        ) : folderStructure ? (
          renderFolder(folderStructure)
        ) : (
          <p>No folders found</p>
        )}
      </div>
      {contextMenu && (
        <div ref={contextMenuRef}>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>
      )}
      {/* Create Folder Modal */}
      <Modal show={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <Modal.Header>Create New Folder</Modal.Header>
        <Modal.Body>
          <TextInput
            type="text"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={createFolder}>Create</Button>
          <Button color="gray" onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal show={renameModalOpen} onClose={() => setRenameModalOpen(false)}>
        <Modal.Header>Rename Folder</Modal.Header>
        <Modal.Body>
          <TextInput
            type="text"
            placeholder="Enter new folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={renameFolder}>Rename</Button>
          <Button color="gray" onClick={() => setRenameModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <Modal.Header>Delete Folder</Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete this folder and all its contents?
          </p>
          <p className="font-bold">{selectedFolderPath}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={deleteFolder}>
            Delete
          </Button>
          <Button color="gray" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FolderTree;
