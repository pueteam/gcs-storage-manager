import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Label, TextInput, Card, Select } from 'flowbite-react';
import { useTheme } from '../ThemeContext';

interface ConfigProps {
  setConfig: React.Dispatch<
    React.SetStateAction<{
      projectId: string;
      credentialsFile: string;
      theme: 'light' | 'dark' | 'system';
    } | null>
  >;
  initialConfig?: {
    projectId: string;
    credentialsFile: string;
    theme: 'light' | 'dark' | 'system';
  } | null;
}

function ConfigScreen({ setConfig, initialConfig }: ConfigProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [formConfig, setFormConfig] = useState({
    projectId: '',
    credentialsFile: '',
    theme: 'system' as 'light' | 'dark' | 'system',
  });

  useEffect(() => {
    if (initialConfig) {
      setFormConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await window.electron.ipcRenderer.invoke('save-config', formConfig);
    setConfig(formConfig);
    setTheme(formConfig.theme);
    navigate('/storage');
  };

  const handleSelectCredentialsFile = async () => {
    const filePath = await window.electron.ipcRenderer.invoke(
      'select-credentials-file',
    );
    if (filePath) {
      setFormConfig({ ...formConfig, credentialsFile: filePath });
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 dark:text-white">
        {initialConfig ? 'Update Configuration' : 'Configuration'}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="projectId" value="GCP Project ID" />
          </div>
          <TextInput
            id="projectId"
            value={formConfig.projectId}
            onChange={(e) =>
              setFormConfig({ ...formConfig, projectId: e.target.value })
            }
            required
          />
        </div>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="credentialsFile" value="Credentials File Path" />
          </div>
          <div className="flex gap-2">
            <TextInput
              id="credentialsFile"
              value={formConfig.credentialsFile}
              onChange={(e) =>
                setFormConfig({
                  ...formConfig,
                  credentialsFile: e.target.value,
                })
              }
              required
            />
            <Button onClick={handleSelectCredentialsFile}>Select File</Button>
          </div>
        </div>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="theme" value="Theme" />
          </div>
          <Select
            id="theme"
            value={formConfig.theme}
            onChange={(e) =>
              setFormConfig({
                ...formConfig,
                theme: e.target.value as 'light' | 'dark' | 'system',
              })
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </Select>
        </div>
        <Button type="submit">
          {initialConfig ? 'Update Configuration' : 'Save and Continue'}
        </Button>
        {initialConfig && (
          <Button color="light" onClick={() => navigate('/storage')}>
            Cancel
          </Button>
        )}
      </form>
    </Card>
  );
}

export default ConfigScreen;
