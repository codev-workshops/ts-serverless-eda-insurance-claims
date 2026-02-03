// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.model.input.generated.AWSEvent;
import com.amazon.settlement.model.input.generated.FraudNotDetected;
import com.amazon.settlement.model.input.generated.marshaller.Marshaller;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * SQS Subscriber Service
 *
 * This service consumes Fraud.Not.Detected events from an SQS queue and orchestrates
 * the settlement processing workflow. It serves as the entry point for event-driven
 * settlement processing in the claims workflow.
 *
 * Event Flow:
 * EventBridge (Fraud.Not.Detected) -> SQS Queue -> This Service -> SettlementService
 *                                                               -> DynamoDB
 *                                                               -> EventBridge (Settlement.Finalized)
 *
 * The service uses Spring Cloud AWS SQS integration for message consumption and
 * publishes Settlement.Finalized events back to EventBridge upon successful processing.
 */
@Slf4j
@Service
public class SubscriberService {

  /** EventBridge custom event bus name, injected from application properties */
  @Value("${eventbus.name}")
  private String eventBusName;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private final EventBridgeClient eventBridgeClient;

  private final SettlementService settlementService;

  /**
   * Constructs a SubscriberService with required dependencies.
   *
   * @param eventBridgeClient Client for publishing events to EventBridge
   * @param settlementService Service for processing settlement business logic
   */
  public SubscriberService(EventBridgeClient eventBridgeClient, SettlementService settlementService) {
    this.eventBridgeClient = eventBridgeClient;
    this.settlementService = settlementService;
  }

  /**
   * Processes incoming Fraud.Not.Detected messages from the SQS queue.
   *
   * This method is automatically invoked by Spring Cloud AWS when messages
   * arrive in the configured SQS queue. It performs the following steps:
   * 1. Unmarshals the EventBridge event from the SQS message
   * 2. Extracts claim and customer details from the event
   * 3. Delegates to SettlementService for settlement calculation and persistence
   * 4. Publishes a Settlement.Finalized event to EventBridge
   *
   * @param message Raw SQS message body containing the EventBridge event JSON
   * @throws RuntimeException if message processing fails
   */
  @SqsListener("${sqs.endpoint.uri}")
  public void receiveMessage(String message) {
    log.info("message received {}", message);

    try {
      AWSEvent<FraudNotDetected> settlement = Marshaller.unmarshalEvent(
        new ByteArrayInputStream(message.getBytes()), FraudNotDetected.class);

      SettlementRequest request = SettlementRequest.builder()
        .customerId(settlement.getDetail().getCustomerId())
        .claimId(settlement.getDetail().getRecordId())
        .color(settlement.getDetail().getAnalyzedFieldAndValues().getColor().getName())
        .damage(settlement.getDetail().getAnalyzedFieldAndValues().getDamage().getName())
        .build();

      SettlementResponse response = settlementService.saveSettlement(request);

      String detailString = objectMapper.writeValueAsString(response);
      PutEventsRequestEntry putEventsRequestEntry = PutEventsRequestEntry.builder()
        .detail(detailString)
        .detailType("Settlement.Finalized")
        .source("settlement.service")
        .eventBusName(eventBusName)
        .build();

      List<PutEventsRequestEntry> requestEntryList = new ArrayList<>();
      requestEntryList.add(putEventsRequestEntry);

      PutEventsRequest putEventsRequest = PutEventsRequest.builder().entries(requestEntryList).build();
      log.info("Publishing Event to EventBridge custom event bus");

      PutEventsResponse resp = eventBridgeClient.putEvents(putEventsRequest);

      if (resp != null) {
        log.info("Object sent. Details: " + resp);
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
