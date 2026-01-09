'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import EditableContent from '@/components/EditableContent';
import { configApi } from '@/lib/api';
import { UIConfig } from '@/types';
import { Settings, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';

const PAGE_OPTIONS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'claims', name: 'Claims List' },
  { id: 'claimForm', name: 'Claim Form' },
  { id: 'admin', name: 'Admin Settings' },
];

export default function AdminPage() {
  const [configs, setConfigs] = useState<UIConfig[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('dashboard');
  const [currentConfig, setCurrentConfig] = useState<UIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newLabelKey, setNewLabelKey] = useState('');
  const [newLabelValue, setNewLabelValue] = useState('');
  const [newContentKey, setNewContentKey] = useState('');
  const [newContentValue, setNewContentValue] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      loadPageConfig(selectedPage);
    }
  }, [selectedPage]);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await configApi.getAll().catch(() => []);
      setConfigs(data);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPageConfig = async (pageId: string) => {
    try {
      const config = await configApi.getByPageId(pageId).catch(() => null);
      setCurrentConfig(config);
    } catch (error) {
      console.error('Error loading page config:', error);
    }
  };

  const handleSave = async () => {
    if (!currentConfig) return;
    try {
      setIsSaving(true);
      const updated = await configApi.update({
        pageId: currentConfig.pageId,
        labels: currentConfig.labels,
        staticContent: currentConfig.staticContent,
      });
      setCurrentConfig(updated);
      await loadConfigs();
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLabelChange = (key: string, value: string) => {
    if (!currentConfig) return;
    setCurrentConfig({
      ...currentConfig,
      labels: { ...currentConfig.labels, [key]: value },
    });
  };

  const handleContentChange = (key: string, value: string) => {
    if (!currentConfig) return;
    setCurrentConfig({
      ...currentConfig,
      staticContent: { ...currentConfig.staticContent, [key]: value },
    });
  };

  const handleDeleteLabel = (key: string) => {
    if (!currentConfig) return;
    const newLabels = { ...currentConfig.labels };
    delete newLabels[key];
    setCurrentConfig({
      ...currentConfig,
      labels: newLabels,
    });
  };

  const handleDeleteContent = (key: string) => {
    if (!currentConfig) return;
    const newContent = { ...currentConfig.staticContent };
    delete newContent[key];
    setCurrentConfig({
      ...currentConfig,
      staticContent: newContent,
    });
  };

  const handleAddLabel = () => {
    if (!currentConfig || !newLabelKey.trim()) return;
    setCurrentConfig({
      ...currentConfig,
      labels: { ...currentConfig.labels, [newLabelKey]: newLabelValue },
    });
    setNewLabelKey('');
    setNewLabelValue('');
  };

  const handleAddContent = () => {
    if (!currentConfig || !newContentKey.trim()) return;
    setCurrentConfig({
      ...currentConfig,
      staticContent: { ...currentConfig.staticContent, [newContentKey]: newContentValue },
    });
    setNewContentKey('');
    setNewContentValue('');
  };

  const getLabel = (key: string, defaultValue: string) => {
    const adminConfig = configs.find((c) => c.pageId === 'admin');
    return adminConfig?.labels?.[key] || defaultValue;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar isAdmin />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAdmin />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <EditableContent
                value={getLabel('pageTitle', 'Admin Settings')}
                onSave={() => {}}
                isEditable={isEditMode}
                as="h1"
                className="text-3xl font-bold text-gray-900"
              />
              <p className="text-gray-600 mt-1">
                {getLabel('uiConfiguration', 'UI Configuration')} - Manage labels and content for all pages
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isEditMode
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditMode ? 'Done Editing' : 'Edit Page'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {getLabel('selectPage', 'Select Page')}
              </h3>
              <div className="space-y-2">
                {PAGE_OPTIONS.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page.id)}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedPage === page.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {currentConfig ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Labels for {PAGE_OPTIONS.find((p) => p.id === selectedPage)?.name}
                    </h2>
                    <button
                      onClick={() => loadPageConfig(selectedPage)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {Object.entries(currentConfig.labels || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-4">
                          <div className="w-1/3">
                            <label className="text-sm font-medium text-gray-500">{key}</label>
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleLabelChange(key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteLabel(key)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                        <div className="w-1/3">
                          <input
                            type="text"
                            value={newLabelKey}
                            onChange={(e) => setNewLabelKey(e.target.value)}
                            placeholder="New label key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newLabelValue}
                            onChange={(e) => setNewLabelValue(e.target.value)}
                            placeholder="Label value"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={handleAddLabel}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Static Content</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {Object.entries(currentConfig.staticContent || {}).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-4">
                          <div className="w-1/3 pt-2">
                            <label className="text-sm font-medium text-gray-500">{key}</label>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={value}
                              onChange={(e) => handleContentChange(key, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteContent(key)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-start gap-4 pt-4 border-t border-gray-100">
                        <div className="w-1/3">
                          <input
                            type="text"
                            value={newContentKey}
                            onChange={(e) => setNewContentKey(e.target.value)}
                            placeholder="New content key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newContentValue}
                            onChange={(e) => setNewContentValue(e.target.value)}
                            placeholder="Content value"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={handleAddContent}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : getLabel('saveChanges', 'Save Changes')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Select a page to configure</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
