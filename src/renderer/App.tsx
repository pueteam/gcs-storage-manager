import React, { useState, useEffect } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { Flowbite, Modal, Button } from 'flowbite-react';
import './App.css';
import ConfigScreen from './components/ConfigScreen';
import BucketList from './components/BucketList';
import BucketContents from './components/BucketContents';
import { ThemeProvider } from './ThemeContext';
import 'tailwindcss/tailwind.css';

function AppContent() {
  const [config, setConfig] = useState<{
    projectId: string;
    credentialsFile: string;
    theme: 'light' | 'dark' | 'system';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig =
          await window.electron.ipcRenderer.invoke('load-config');
        if (savedConfig) {
          setConfig(savedConfig);
        }
      } catch (e) {
        setError(
          'Failed to load configuration. Please check your settings and try again.',
        );
      } finally {
        setLoading(false);
      }
    };
    loadConfig();

    // Add event listener for 'navigate-to-config'
    const handleNavigateToConfig = () => {
      navigate('/config');
    };
    window.electron.ipcRenderer.on(
      'navigate-to-config',
      handleNavigateToConfig,
    );

    // Clean up event listener
    return () => {
      window.electron.ipcRenderer.removeListener(
        'navigate-to-config',
        handleNavigateToConfig,
      );
    };
  }, [navigate]);

  const handleErrorClose = () => {
    setError(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Routes>
        <Route
          path="/"
          element={config ? <BucketList /> : <Navigate to="/config" replace />}
        />
        <Route
          path="/bucket/:bucketName"
          element={
            config ? <BucketContents /> : <Navigate to="/config" replace />
          }
        />
        <Route
          path="/config"
          element={
            <ConfigScreen setConfig={setConfig} initialConfig={config} />
          }
        />
      </Routes>
      {/* Error Modal */}
      <Modal show={error !== null} onClose={handleErrorClose}>
        <Modal.Header>Error</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
              {error}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleErrorClose}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Flowbite>
        <Router>
          <AppContent />
        </Router>
      </Flowbite>
    </ThemeProvider>
  );
}
