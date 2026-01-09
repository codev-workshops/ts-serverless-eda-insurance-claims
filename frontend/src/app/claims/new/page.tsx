'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ClaimForm from '@/components/ClaimForm';
import EditableContent from '@/components/EditableContent';
import { claimsApi, configApi } from '@/lib/api';
import { ClaimRequest, UIConfig } from '@/types';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewClaimPage() {
  const router = useRouter();
  const [config, setConfig] = useState<UIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configData = await configApi.getByPageId('claimForm').catch(() => null);
      setConfig(configData);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleSubmit = async (data: ClaimRequest) => {
    try {
      setIsLoading(true);
      await claimsApi.create(data);
      setSuccess(true);
      setTimeout(() => {
        router.push('/claims');
      }, 2000);
    } catch (error) {
      console.error('Error creating claim:', error);
      alert('Failed to create claim. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelUpdate = async (key: string, value: string) => {
    if (!config) return;
    try {
      const updatedConfig = await configApi.update({
        pageId: 'claimForm',
        labels: { ...config.labels, [key]: value },
      });
      setConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  const getLabel = (key: string, defaultValue: string) => {
    return config?.labels?.[key] || defaultValue;
  };

  const getContent = (key: string, defaultValue: string) => {
    return config?.staticContent?.[key] || defaultValue;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getContent('successMessage', 'Your claim has been submitted successfully!')}
            </h2>
            <p className="text-gray-600 mb-4">
              Redirecting to claims list...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/claims"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Claims
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <EditableContent
              value={getLabel('pageTitle', 'Submit New Claim')}
              onSave={(value) => handleLabelUpdate('pageTitle', value)}
              isEditable={isEditMode}
              as="h1"
              className="text-3xl font-bold text-gray-900"
            />
            <p className="text-gray-600 mt-1">
              {getContent('instructions', 'Please fill out all required fields to submit your claim.')}
            </p>
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

        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
          <ClaimForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel={getLabel('submit', 'Submit Claim')}
          />
        </div>
      </main>
    </div>
  );
}
