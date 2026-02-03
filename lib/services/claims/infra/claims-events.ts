// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Claims Service Event Constants
 *
 * Defines the event sources and detail types used by the Claims Service
 * for publishing events to EventBridge during the claims processing workflow.
 *
 * Event Flow:
 * 1. Claim.Requested - Published when customer submits FNOL (First Notice of Loss)
 * 2. Claim.Accepted - Published when claim passes validation (policy and personal info)
 * 3. Claim.Rejected - Published when claim fails validation checks
 */
export enum ClaimsEvents {
  /** Event source identifier for FNOL (First Notice of Loss) submissions */
  FNOL_SOURCE = "fnol.service",

  /** Event source identifier for claims processing events */
  CLAIMS_SOURCE = "claims.service",

  /** Detail type for claims that pass validation and are accepted for processing */
  CLAIM_ACCEPTED = "Claim.Accepted",

  /** Detail type for claims that fail validation and are rejected */
  CLAIM_REJECTED = "Claim.Rejected",

  /** Detail type for initial claim submission requests */
  CLAIM_REQUESTED = "Claim.Requested",
}
