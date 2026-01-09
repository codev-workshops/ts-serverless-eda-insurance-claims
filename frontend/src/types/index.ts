export enum ClaimType {
  AUTO = 'AUTO',
  HEALTH = 'HEALTH',
  PROPERTY = 'PROPERTY',
  LIFE = 'LIFE',
}

export enum ClaimStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Claim {
  id: string;
  policyNumber: string;
  claimantName: string;
  claimantEmail?: string;
  claimType: ClaimType;
  claimAmount: number;
  incidentDate: string;
  description?: string;
  status: ClaimStatus;
  documentUrls?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ClaimRequest {
  policyNumber: string;
  claimantName: string;
  claimantEmail?: string;
  claimType: ClaimType;
  claimAmount: number;
  incidentDate: string;
  description?: string;
  documentUrls?: string[];
}

export interface DashboardStats {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  underReviewClaims: number;
  totalClaimAmount: number;
  approvedClaimAmount: number;
}

export interface UIConfig {
  id: string;
  pageId: string;
  labels: Record<string, string>;
  staticContent: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
  isAdmin?: boolean;
}
