import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../renderer/App';
import { ElectronHandler } from '../main/preload';

// Define a type that extends the original type with Jest mock methods
type MockedFunction<T extends (...args: any[]) => any> =
  jest.MockedFunction<T> & T;

// Mock the electron object
const mockIpcRenderer: {
  [K in keyof ElectronHandler['ipcRenderer']]: MockedFunction<
    ElectronHandler['ipcRenderer'][K]
  >;
} = {
  sendMessage: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  invoke: jest.fn(),
};

const mockElectron: ElectronHandler = {
  ipcRenderer: mockIpcRenderer,
};

// Mock the ConfigScreen component
jest.mock('../renderer/components/ConfigScreen', () => {
  return function DummyConfigScreen({ setConfig }: { setConfig: Function }) {
    return (
      <div data-testid="config-screen">
        <button
          type="button"
          onClick={() => {
            setConfig({
              projectId: 'test-project',
              credentialsFile: '/path/to/credentials.json',
              theme: 'light',
            });
            // Simulate saving config
            mockIpcRenderer.invoke('save-config', {
              projectId: 'test-project',
              credentialsFile: '/path/to/credentials.json',
              theme: 'light',
            });
          }}
        >
          Set Config
        </button>
      </div>
    );
  };
});

// Mock the BucketList component
jest.mock('../renderer/components/BucketList', () => {
  return function DummyBucketList() {
    return <div data-testid="bucket-list">Bucket List</div>;
  };
});

// Mock the StorageManager component
jest.mock('../renderer/components/StorageManager', () => {
  return function DummyStorageManager() {
    return <div data-testid="storage-manager">Storage Manager</div>;
  };
});

// Mock the BulkUpload component
jest.mock('../renderer/components/BulkUpload', () => {
  return function DummyBulkUpload() {
    return <div data-testid="bulk-upload">Bulk Upload</div>;
  };
});

// Mock the FileUpload component
jest.mock('../renderer/components/FileUpload', () => {
  return function DummyFileUpload() {
    return <div data-testid="file-upload">File Upload</div>;
  };
});

// Mock the react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Set up the mock before running tests
beforeAll(() => {
  (window as any).electron = mockElectron;
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

describe('App Component', () => {
  it('should render without crashing', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('config-screen')).toBeInTheDocument();
    });
  });

  it('should show ConfigScreen when no config is set', async () => {
    mockIpcRenderer.invoke.mockResolvedValueOnce(null); // Simulate no saved config

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('config-screen')).toBeInTheDocument();
    });
  });

  it('should show BucketList when config is set', async () => {
    mockIpcRenderer.invoke
      .mockResolvedValueOnce({
        projectId: 'test-project',
        credentialsFile: '/path/to/credentials.json',
        theme: 'light',
      })
      .mockResolvedValueOnce([
        {
          name: 'bucket1',
          created: '2023-01-01T00:00:00Z',
          location: 'US',
          storageClass: 'STANDARD',
        },
        {
          name: 'bucket2',
          created: '2023-01-02T00:00:00Z',
          location: 'EU',
          storageClass: 'NEARLINE',
        },
      ]);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('bucket-list')).toBeInTheDocument();
    });
  });

  it('should handle error when loading config', async () => {
    mockIpcRenderer.invoke.mockRejectedValueOnce(
      new Error('Failed to load config'),
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load configuration/i),
      ).toBeInTheDocument();
    });
  });
});
