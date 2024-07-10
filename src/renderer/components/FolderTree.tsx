/** eslint-disable jsx-a11y/click-events-have-key-events */
/** eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineFolder,
  HiChevronRight,
  HiChevronDown,
  HiSearch,
  HiOutlineChevronDoubleDown,
  HiOutlineChevronDoubleUp,
} from 'react-icons/hi';
import { Button, TextInput, Modal, Tooltip, Spinner } from 'flowbite-react';

import ContextMenu from './ContextMenu';

interface FolderTreeProps {
  bucketName: string;
  onFolderSelect: (path: string) => void;
  onFolderChange: () => void;
  selectedFolder: string;
  refreshTrigger: number;
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
  selectedFolder,
  refreshTrigger,
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
  const [animatingFolders, setAnimatingFolders] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const timeouts: NodeJS.Timeout[] = [];
    animatingFolders.forEach((folderPath) => {
      const timeout = setTimeout(() => {
        setAnimatingFolders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderPath);
          return newSet;
        });
      }, 300); // Duration of the animation
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [animatingFolders]);

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

  useEffect(() => {
    fetchFolderStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketName, refreshTrigger]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const getAllPaths = (node: FolderNode): string[] => {
    let paths = [node.path];
    node.children.forEach((child) => {
      paths = [...paths, ...getAllPaths(child)];
    });
    return paths;
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

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, path: string) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, path });
      setSelectedFolderPath(path);
    },
    [],
  );

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
      try {
        await window.electron.ipcRenderer.invoke('create-folder-tree', {
          bucketName,
          pth: `${selectedFolderPath}/${newFolderName}`,
        });
        setAnimatingFolders((prev) =>
          new Set(prev).add(`${selectedFolderPath}/${newFolderName}`),
        );
        await fetchFolderStructure();
        setCreateModalOpen(false);
        onFolderChange();
      } catch (error) {
        console.error('Error creating folder:', error);
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
      setAnimatingFolders((prev) => new Set(prev).add(selectedFolderPath));
      await window.electron.ipcRenderer.invoke('delete-folder', {
        bucketName,
        p: selectedFolderPath,
      });
      fetchFolderStructure();
      setDeleteModalOpen(false);
      onFolderChange();
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const renderFolder = useCallback(
    (folder: FolderNode, level: number = 0): React.ReactNode => {
      const isExpanded = expandedFolders.has(folder.path);
      const isAnimating = animatingFolders.has(folder.path);
      const matchesSearch = folderMatchesSearch(folder);
      const isSelected = folder.path === selectedFolder;

      const getFolderIcon = (hasChildren: boolean, isExpandedF: boolean) => {
        if (!hasChildren) {
          return <span className="w-5" aria-hidden="true" />;
        }
        if (isExpandedF) {
          return (
            <HiChevronDown
              className="w-5 h-5 text-gray-500"
              aria-hidden="true"
            />
          );
        }
        return (
          <HiChevronRight
            className="w-5 h-5 text-gray-500"
            aria-hidden="true"
          />
        );
      };

      if (searchTerm && !matchesSearch) {
        return null;
      }

      return (
        <div
          key={folder.path}
          className={`
              transition-all duration-300 ease-in-out
              ${isAnimating ? 'animate-folder' : ''}
            `}
          style={{
            marginLeft: `${level * 0}px`,
            maxHeight: isAnimating || isExpanded ? '1000px' : '30px',
            opacity: isAnimating ? 0 : 1,
          }}
        >
          <button
            type="button"
            className={`flex items-center w-full text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded focus:bg-gray-200 dark:focus:bg-gray-600 transition-all duration-150 ease-in-out ${
              isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
            style={{ marginLeft: `${level * 15}px` }}
            onClick={() => {
              toggleFolder(folder.path);
              onFolderSelect(folder.path);
            }}
            onContextMenu={(e) => handleContextMenu(e, folder.path)}
            aria-label={`${folder.name} ${
              folder.children.length > 0 ? 'folder' : 'file'
            } ${isExpanded ? 'expanded' : 'collapsed'}`}
          >
            {getFolderIcon(folder.children.length > 0, isExpanded)}
            <HiOutlineFolder
              className="w-5 h-5 text-yellow-500 mr-2"
              aria-hidden="true"
            />
            <span className="text-sm dark:text-blue-400">{folder.name}</span>
          </button>
          {(isExpanded || searchTerm) &&
            folder.children.map((child) => renderFolder(child, level + 1))}
        </div>
      );
    },
    [
      expandedFolders,
      animatingFolders,
      searchTerm,
      toggleFolder,
      onFolderSelect,
      handleContextMenu,
      folderMatchesSearch,
      selectedFolder,
    ],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75">
          <Spinner size="xl" />
        </div>
      );
    }

    if (!folderStructure) {
      return <p>No folders found</p>;
    }

    return renderFolder(folderStructure);
  };

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
            <Button
              size="sm"
              color="gray"
              onClick={expandAll}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <HiOutlineChevronDoubleDown className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Collapse All">
            <Button
              size="sm"
              color="gray"
              onClick={collapseAll}
              className="p-1 ml-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <HiOutlineChevronDoubleUp className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex-grow overflow-auto relative">{renderContent()}</div>
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
          <p className="dark:text-slate-400">
            Are you sure you want to delete this folder and all its contents?
          </p>
          <p className="font-bold dark:text-white">{selectedFolderPath}</p>
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
