import React, { useState, useEffect } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Flowbite } from 'flowbite-react';
import './App.css';
import ConfigScreen from './components/ConfigScreen';
import StorageManager from './components/StorageManager';
import { ThemeProvider } from './ThemeContext';
import 'tailwindcss/tailwind.css';

export default function App() {
  const [config, setConfig] = useState<{
    projectId: string;
    credentialsFile: string;
    theme: 'light' | 'dark' | 'system';
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig =
          await window.electron.ipcRenderer.invoke('load-config');
        if (savedConfig) {
          setConfig(savedConfig);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // You could use a Flowbite Spinner here
  }

  return (
    <ThemeProvider>
      <Flowbite>
        <Router>
          <div className="container mx-auto p-4">
            <Routes>
              <Route
                path="/"
                element={
                  config ? (
                    <Navigate to="/storage" replace />
                  ) : (
                    <ConfigScreen setConfig={setConfig} />
                  )
                }
              />
              <Route
                path="/storage"
                element={
                  config ? (
                    <StorageManager config={config} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/config"
                element={
                  <ConfigScreen setConfig={setConfig} initialConfig={config} />
                }
              />
            </Routes>
          </div>
        </Router>
      </Flowbite>
    </ThemeProvider>
  );
}
