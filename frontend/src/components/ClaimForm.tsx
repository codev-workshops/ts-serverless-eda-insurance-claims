'use client';

import { useState } from 'react';
import { ClaimType, ClaimRequest } from '@/types';

interface ClaimFormProps {
  initialData?: Partial<ClaimRequest>;
  onSubmit: (data: ClaimRequest) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export default function ClaimForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Submit Claim',
}: ClaimFormProps) {
  const [formData, setFormData] = useState<ClaimRequest>({
    policyNumber: initialData?.policyNumber || '',
    claimantName: initialData?.claimantName || '',
    claimantEmail: initialData?.claimantEmail || '',
    claimType: initialData?.claimType || ClaimType.AUTO,
    claimAmount: initialData?.claimAmount || 0,
    incidentDate: initialData?.incidentDate || '',
    description: initialData?.description || '',
    documentUrls: initialData?.documentUrls || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.policyNumber.trim()) {
      newErrors.policyNumber = 'Policy number is required';
    }
    if (!formData.claimantName.trim()) {
      newErrors.claimantName = 'Claimant name is required';
    }
    if (!formData.claimType) {
      newErrors.claimType = 'Claim type is required';
    }
    if (!formData.claimAmount || formData.claimAmount <= 0) {
      newErrors.claimAmount = 'Claim amount must be greater than 0';
    }
    if (!formData.incidentDate) {
      newErrors.incidentDate = 'Incident date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'claimAmount' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="policyNumber" className="block text-sm font-medium text-gray-700">
            Policy Number *
          </label>
          <input
            type="text"
            id="policyNumber"
            name="policyNumber"
            value={formData.policyNumber}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.policyNumber ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="POL-123456"
          />
          {errors.policyNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.policyNumber}</p>
          )}
        </div>

        <div>
          <label htmlFor="claimantName" className="block text-sm font-medium text-gray-700">
            Claimant Name *
          </label>
          <input
            type="text"
            id="claimantName"
            name="claimantName"
            value={formData.claimantName}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.claimantName ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="John Doe"
          />
          {errors.claimantName && (
            <p className="mt-1 text-sm text-red-600">{errors.claimantName}</p>
          )}
        </div>

        <div>
          <label htmlFor="claimantEmail" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="claimantEmail"
            name="claimantEmail"
            value={formData.claimantEmail}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="claimType" className="block text-sm font-medium text-gray-700">
            Claim Type *
          </label>
          <select
            id="claimType"
            name="claimType"
            value={formData.claimType}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.claimType ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            <option value={ClaimType.AUTO}>Auto</option>
            <option value={ClaimType.HEALTH}>Health</option>
            <option value={ClaimType.PROPERTY}>Property</option>
            <option value={ClaimType.LIFE}>Life</option>
          </select>
          {errors.claimType && (
            <p className="mt-1 text-sm text-red-600">{errors.claimType}</p>
          )}
        </div>

        <div>
          <label htmlFor="claimAmount" className="block text-sm font-medium text-gray-700">
            Claim Amount ($) *
          </label>
          <input
            type="number"
            id="claimAmount"
            name="claimAmount"
            value={formData.claimAmount}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`mt-1 block w-full rounded-md border ${
              errors.claimAmount ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="1000.00"
          />
          {errors.claimAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.claimAmount}</p>
          )}
        </div>

        <div>
          <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700">
            Incident Date *
          </label>
          <input
            type="date"
            id="incidentDate"
            name="incidentDate"
            value={formData.incidentDate}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.incidentDate ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          />
          {errors.incidentDate && (
            <p className="mt-1 text-sm text-red-600">{errors.incidentDate}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Please describe the incident in detail..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
