// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.controllers;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.services.SettlementService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Settlement REST Controller
 *
 * Exposes a REST API endpoint for direct settlement processing requests.
 * While the primary flow is event-driven through SQS, this endpoint allows
 * for synchronous settlement processing for testing or alternative integrations.
 *
 * Note: In the standard claims workflow, settlements are triggered by
 * Fraud.Not.Detected events consumed via SQS by the SubscriberService.
 */
@Slf4j
@RestController
public class SettlementController {

  private final SettlementService settlementService;

  /**
   * Constructs a SettlementController with the required service dependency.
   *
   * @param settlementService Service for processing settlement business logic
   */
  public SettlementController(SettlementService settlementService) {
    this.settlementService = settlementService;
  }

  /**
   * Processes a settlement request via REST API.
   *
   * @param requestCommand Settlement request containing claim ID, customer ID,
   *                       vehicle color, and damage type
   * @return SettlementResponse with settlement ID and customer message
   */
  @PostMapping(value = "/settlement", produces = MediaType.APPLICATION_JSON_VALUE)
  public SettlementResponse saveSettlement(final @RequestBody SettlementRequest requestCommand) {
    return settlementService.saveSettlement(requestCommand);
  }
}
