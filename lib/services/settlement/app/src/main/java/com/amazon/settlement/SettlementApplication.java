// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Settlement Service Application Entry Point
 *
 * This Spring Boot application handles insurance claim settlement processing.
 * It runs as a containerized service on Amazon ECS Fargate and performs the following:
 *
 * 1. Consumes Fraud.Not.Detected events from an SQS queue (via SubscriberService)
 * 2. Calculates settlement amounts based on damage analysis
 * 3. Persists settlement records to DynamoDB
 * 4. Publishes Settlement.Finalized events to EventBridge
 *
 * The service also exposes a REST API endpoint for direct settlement requests,
 * though the primary flow is event-driven through SQS.
 *
 * @see com.amazon.settlement.services.SubscriberService
 * @see com.amazon.settlement.services.SettlementService
 */
@Slf4j
@SpringBootApplication
public class SettlementApplication {

  /**
   * Application entry point.
   *
   * @param args Command line arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(SettlementApplication.class, args);
  }
}
