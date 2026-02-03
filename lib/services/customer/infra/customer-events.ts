// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Customer Service Event Constants
 *
 * Defines the event sources and detail types used by the Customer Service
 * for publishing events to EventBridge. These constants ensure consistency
 * across event producers and consumers.
 *
 * Event Flow:
 * 1. Customer.Submitted - Published when a customer submits registration form
 * 2. Customer.Accepted - Published when registration is validated and accepted
 * 3. Customer.Rejected - Published when registration fails validation
 */
export enum CustomerEvents {
  /** Event source identifier for customer-related events */
  CUSTOMER_SOURCE = "customer.service",

  /** Event source identifier for signup/registration events */
  SIGNUP_SOURCE = "signup.service",

  /** Detail type for successful customer registration */
  CUSTOMER_ACCEPTED = "Customer.Accepted",

  /** Detail type for rejected customer registration */
  CUSTOMER_REJECTED = "Customer.Rejected",

  /** Detail type for initial customer registration submission */
  CUSTOMER_SUBMITTED = "Customer.Submitted",
}
