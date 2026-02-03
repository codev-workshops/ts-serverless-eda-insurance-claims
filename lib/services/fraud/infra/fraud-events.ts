// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Fraud Service Event Constants
 *
 * Defines the event sources and detail types used by the Fraud Service
 * for publishing fraud detection results to EventBridge.
 *
 * The Fraud Service performs two types of validation:
 * - Identity Fraud: Compares name on registration with driver's license
 * - Asset Fraud: Verifies vehicle color matches policy records
 *
 * Event Flow:
 * - Fraud.Not.Detected triggers downstream processing (Settlement, Claims update)
 * - Fraud.Detected halts the workflow and notifies the customer
 */
export enum FraudEvents {
  /** Event source identifier for fraud detection events */
  SOURCE = "fraud.service",

  /** Detail type published when potential fraud is identified */
  FRAUD_DETECTED = "Fraud.Detected",

  /** Detail type published when no fraud indicators are found */
  FRAUD_NOT_DETECTED = "Fraud.Not.Detected",
}
