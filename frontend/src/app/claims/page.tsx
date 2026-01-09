'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import ClaimTypeBadge from '@/components/ClaimTypeBadge';
import EditableContent from '@/components/EditableContent';
import { claimsApi, configApi } from '@/lib/api';
import { Claim, ClaimStatus, UIConfig } from '@/types';
import { PlusCircle, Eye, Trash2, FileText, Filter } from 'lucide-react';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [config, setConfig] = useState<UIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [claimsData, configData] = await Promise.all([
        claimsApi.getAll(true).catch(() => []),
        configApi.getByPageId('claims').catch(() => null),
      ]);
      setClaims(claimsData);
      setConfig(configData);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await claimsApi.delete(id);
      setClaims(claims.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting claim:', error);
    }
  };

  const handleLabelUpdate = async (key: string, value: string) => {
    if (!config) return;
    try {
      const updatedConfig = await configApi.update({
        pageId: 'claims',
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredClaims = statusFilter === 'ALL'
    ? claims
    : claims.filter((c) => c.status === statusFilter);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <EditableContent
              value={getLabel('pageTitle', 'Claims')}
              onSave={(value) => handleLabelUpdate('pageTitle', value)}
              isEditable={isEditMode}
              as="h1"
              className="text-3xl font-bold text-gray-900"
            />
            <p className="text-gray-600 mt-1">
              Manage and track all insurance claims
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            <Link
              href="/claims/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {getLabel('newClaim', 'New Claim')}
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value={ClaimStatus.PENDING}>Pending</option>
              <option value={ClaimStatus.UNDER_REVIEW}>Under Review</option>
              <option value={ClaimStatus.APPROVED}>Approved</option>
              <option value={ClaimStatus.REJECTED}>Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{getContent('noClaimsMessage', 'No claims found. Submit your first claim!')}</p>
                <Link
                  href="/claims/new"
                  className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Create New Claim
                </Link>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('claimId', 'Claim ID')}
                        onSave={(value) => handleLabelUpdate('claimId', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('policyNumber', 'Policy Number')}
                        onSave={(value) => handleLabelUpdate('policyNumber', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('claimantName', 'Claimant Name')}
                        onSave={(value) => handleLabelUpdate('claimantName', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('claimType', 'Type')}
                        onSave={(value) => handleLabelUpdate('claimType', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('amount', 'Amount')}
                        onSave={(value) => handleLabelUpdate('amount', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('status', 'Status')}
                        onSave={(value) => handleLabelUpdate('status', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <EditableContent
                        value={getLabel('actions', 'Actions')}
                        onSave={(value) => handleLabelUpdate('actions', value)}
                        isEditable={isEditMode}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {claim.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {claim.policyNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {claim.claimantName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClaimTypeBadge type={claim.claimType} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(claim.claimAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(claim.incidentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/claims/${claim.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {deleteConfirm === claim.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(claim.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(claim.id)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      </main>
    </div>
  );
}
