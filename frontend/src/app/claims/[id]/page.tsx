'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import ClaimTypeBadge from '@/components/ClaimTypeBadge';
import ClaimForm from '@/components/ClaimForm';
import { claimsApi } from '@/lib/api';
import { Claim, ClaimStatus, ClaimRequest } from '@/types';
import { ArrowLeft, Edit, X, Trash2 } from 'lucide-react';

export default function ClaimDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const claimId = params.id as string;

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        setIsLoading(true);
        const data = await claimsApi.getById(claimId);
        setClaim(data);
      } catch (error) {
        console.error('Error loading claim:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (claimId) {
      fetchClaim();
    }
  }, [claimId]);

  const handleUpdate = async (data: ClaimRequest) => {
    try {
      setIsSaving(true);
      const updated = await claimsApi.update(claimId, data);
      setClaim(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating claim:', error);
      alert('Failed to update claim. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ClaimStatus) => {
    try {
      const updated = await claimsApi.updateStatus(claimId, newStatus);
      setClaim(updated);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await claimsApi.delete(claimId);
      router.push('/claims');
    } catch (error) {
      console.error('Error deleting claim:', error);
      alert('Failed to delete claim. Please try again.');
    }
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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Claim Not Found</h2>
            <p className="text-gray-600 mb-4">The claim you are looking for does not exist.</p>
            <Link
              href="/claims"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Claims
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel Editing
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Claim</h1>

          <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
            <ClaimForm
              initialData={{
                policyNumber: claim.policyNumber,
                claimantName: claim.claimantName,
                claimantEmail: claim.claimantEmail,
                claimType: claim.claimType,
                claimAmount: claim.claimAmount,
                incidentDate: claim.incidentDate,
                description: claim.description,
                documentUrls: claim.documentUrls,
              }}
              onSubmit={handleUpdate}
              isLoading={isSaving}
              submitLabel="Save Changes"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/claims"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Claims
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Claim Details</h1>
              <p className="text-sm text-gray-500 mt-1">ID: {claim.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Policy Number</h3>
                <p className="text-lg text-gray-900">{claim.policyNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Claimant Name</h3>
                <p className="text-lg text-gray-900">{claim.claimantName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                <p className="text-lg text-gray-900">{claim.claimantEmail || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Claim Type</h3>
                <ClaimTypeBadge type={claim.claimType} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Claim Amount</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(claim.claimAmount)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Incident Date</h3>
                <p className="text-lg text-gray-900">{formatDate(claim.incidentDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <div className="flex items-center gap-3">
                  <ClaimStatusBadge status={claim.status} />
                  <select
                    value={claim.status}
                    onChange={(e) => handleStatusChange(e.target.value as ClaimStatus)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={ClaimStatus.PENDING}>Pending</option>
                    <option value={ClaimStatus.UNDER_REVIEW}>Under Review</option>
                    <option value={ClaimStatus.APPROVED}>Approved</option>
                    <option value={ClaimStatus.REJECTED}>Rejected</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Created At</h3>
                <p className="text-lg text-gray-900">{formatDateTime(claim.createdAt)}</p>
              </div>
            </div>

            {claim.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{claim.description}</p>
                </div>
              </div>
            )}

            {claim.updatedAt && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Last updated: {formatDateTime(claim.updatedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
