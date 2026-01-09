'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import ClaimTypeBadge from '@/components/ClaimTypeBadge';
import EditableContent from '@/components/EditableContent';
import { claimsApi, configApi } from '@/lib/api';
import { DashboardStats, Claim, UIConfig } from '@/types';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  DollarSign,
  TrendingUp,
  PlusCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [config, setConfig] = useState<UIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, claimsData, configData] = await Promise.all([
        claimsApi.getStats(true).catch(() => ({
          totalClaims: 0,
          pendingClaims: 0,
          approvedClaims: 0,
          rejectedClaims: 0,
          underReviewClaims: 0,
          totalClaimAmount: 0,
          approvedClaimAmount: 0,
        })),
        claimsApi.getAll(true).catch(() => []),
        configApi.getByPageId('dashboard').catch(() => null),
      ]);
      setStats(statsData);
      setRecentClaims(claimsData.slice(0, 5));
      setConfig(configData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelUpdate = async (key: string, value: string) => {
    if (!config) return;
    try {
      const updatedConfig = await configApi.update({
        pageId: 'dashboard',
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
              value={getLabel('pageTitle', 'Dashboard')}
              onSave={(value) => handleLabelUpdate('pageTitle', value)}
              isEditable={isEditMode}
              as="h1"
              className="text-3xl font-bold text-gray-900"
            />
            <p className="text-gray-600 mt-1">
              {getContent('welcomeMessage', 'Welcome to Insurance Claims Portal')}
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
              New Claim
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={getLabel('totalClaims', 'Total Claims')}
            value={stats?.totalClaims || 0}
            icon={FileText}
            color="blue"
          />
          <StatsCard
            title={getLabel('pendingClaims', 'Pending')}
            value={stats?.pendingClaims || 0}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title={getLabel('approvedClaims', 'Approved')}
            value={stats?.approvedClaims || 0}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title={getLabel('rejectedClaims', 'Rejected')}
            value={stats?.rejectedClaims || 0}
            icon={XCircle}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Under Review"
            value={stats?.underReviewClaims || 0}
            icon={Search}
            color="purple"
          />
          <StatsCard
            title="Total Claim Amount"
            value={formatCurrency(stats?.totalClaimAmount || 0)}
            icon={DollarSign}
            color="blue"
          />
          <StatsCard
            title="Approved Amount"
            value={formatCurrency(stats?.approvedClaimAmount || 0)}
            icon={TrendingUp}
            color="green"
          />
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Claims</h2>
          </div>
          <div className="overflow-x-auto">
            {recentClaims.length === 0 ? (
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
                      Claim ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Claimant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {claim.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {claim.claimantName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClaimTypeBadge type={claim.claimType} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(claim.claimAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/claims/${claim.id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {recentClaims.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <Link
                href="/claims"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All Claims
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
