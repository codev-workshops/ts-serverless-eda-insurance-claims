// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.repository.SettlementRepository;
import org.springframework.stereotype.Service;

/**
 * Settlement Service
 *
 * Business logic layer for processing insurance claim settlements.
 * This service calculates settlement amounts and generates customer-facing
 * messages based on the damage analysis results from the fraud detection phase.
 *
 * In this demo implementation, the settlement amount is fixed at $100.00.
 * In a production system, this would integrate with actuarial models and
 * policy coverage calculations.
 */
@Service
public class SettlementService {

  private final SettlementRepository settlementRepository;

  /**
   * Constructs a SettlementService with the required repository dependency.
   *
   * @param settlementRepository Repository for persisting settlement records
   */
  public SettlementService(SettlementRepository settlementRepository) {
    this.settlementRepository = settlementRepository;
  }

  /**
   * Processes a settlement request and persists the result.
   *
   * Calculates the settlement amount (fixed at $100.00 for demo purposes),
   * generates a customer-facing message, and delegates to the repository
   * for persistence and event publishing.
   *
   * @param requestCommand Settlement request containing claim and customer details
   * @return SettlementResponse with settlement ID and message
   */
  public SettlementResponse saveSettlement(final SettlementRequest requestCommand) {
    String settlementMessage = String.format(
      "Based on our analysis on the damage of your car per claim id %s, your out-of-pocket expense will be %s.",
      requestCommand.getClaimId(),
      "$100.00"
    );

    return settlementRepository.saveSettlement(requestCommand, settlementMessage);
  }
}
