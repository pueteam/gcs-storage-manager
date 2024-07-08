import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Label, TextInput, Card } from 'flowbite-react';

interface ConfigProps {
  config: { projectId: string; credentialsFile: string };
  setConfig: React.Dispatch<
    React.SetStateAction<{ projectId: string; credentialsFile: string }>
  >;
}

// const ConfigScreen: React.FC<ConfigProps> = ({ config, setConfig }) => {
function ConfigScreen({ config, setConfig }: ConfigProps) {
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically save the config to electron-store
    console.log(config);
    // const filePath = await window.electron.ipcRenderer.openFile();
    window.electron.ipcRenderer.invoke('save-config', config);
    navigate('/storage');
  };

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">GCP Configuration</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="projectId" value="GCP Project ID" />
          </div>
          <TextInput
            id="projectId"
            value={config.projectId}
            onChange={(e) =>
              setConfig({ ...config, projectId: e.target.value })
            }
            required
          />
        </div>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="credentialsFile" value="Credentials File Path" />
          </div>
          <TextInput
            id="credentialsFile"
            value={config.credentialsFile}
            onChange={(e) =>
              setConfig({ ...config, credentialsFile: e.target.value })
            }
            required
          />
        </div>
        <Button type="submit">Save and Continue</Button>
      </form>
    </Card>
  );
}

export default ConfigScreen;
