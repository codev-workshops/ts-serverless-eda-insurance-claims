'use client';

import { ClaimType } from '@/types';
import { Car, Heart, Home, Shield } from 'lucide-react';

interface ClaimTypeBadgeProps {
  type: ClaimType;
}

const typeConfig = {
  [ClaimType.AUTO]: {
    label: 'Auto',
    icon: Car,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [ClaimType.HEALTH]: {
    label: 'Health',
    icon: Heart,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  [ClaimType.PROPERTY]: {
    label: 'Property',
    icon: Home,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  [ClaimType.LIFE]: {
    label: 'Life',
    icon: Shield,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export default function ClaimTypeBadge({ type }: ClaimTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig[ClaimType.AUTO];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}
