import React from 'react';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';

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
            type="button"
            onClick={onCreateFolder}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <HiPlus className="mr-2" /> Create Folder
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onRenameFolder}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <HiPencil className="mr-2" /> Rename Folder
          </button>
        </li>
        <li>
          <button
            type="button"
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

export default ContextMenu;
