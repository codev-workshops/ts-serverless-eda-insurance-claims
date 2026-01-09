'use client';

import { ClaimStatus } from '@/types';

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
}

const statusConfig = {
  [ClaimStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800',
  },
  [ClaimStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    className: 'bg-blue-100 text-blue-800',
  },
  [ClaimStatus.APPROVED]: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800',
  },
  [ClaimStatus.REJECTED]: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
};

export default function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[ClaimStatus.PENDING];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
