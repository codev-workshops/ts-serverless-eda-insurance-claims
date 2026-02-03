// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubscriberServiceTest {

  @Mock
  private EventBridgeClient eventBridgeClient;

  @Mock
  private SettlementService settlementService;

  private SubscriberService subscriberService;

  private String testEventJson;

  @BeforeEach
  void setUp() throws IOException {
    subscriberService = new SubscriberService(eventBridgeClient, settlementService);
    ReflectionTestUtils.setField(subscriberService, "eventBusName", "test-event-bus");

    testEventJson = new String(Files.readAllBytes(
      Paths.get("src/test/resources/testdata.json")));
  }

  @Test
  void receiveMessage_shouldProcessFraudNotDetectedEvent() {
    SettlementResponse mockResponse = SettlementResponse.builder()
      .settlementId("SETTLE-001")
      .customerId("af187005-4eef-49d2-a619-64e65cfcc4bd")
      .claimId("e15c19b1-9b44-4db2-9119-9e0df9c08c36")
      .settlementMessage("Settlement processed")
      .build();

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(mockResponse);
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(settlementService, times(1)).saveSettlement(any(SettlementRequest.class));
    verify(eventBridgeClient, times(1)).putEvents(any(PutEventsRequest.class));
  }

  @Test
  void receiveMessage_shouldExtractCorrectCustomerIdFromEvent() {
    ArgumentCaptor<SettlementRequest> requestCaptor = ArgumentCaptor.forClass(SettlementRequest.class);

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(SettlementResponse.builder().build());
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(settlementService).saveSettlement(requestCaptor.capture());
    SettlementRequest capturedRequest = requestCaptor.getValue();

    assertEquals("af187005-4eef-49d2-a619-64e65cfcc4bd", capturedRequest.getCustomerId());
  }

  @Test
  void receiveMessage_shouldExtractCorrectClaimIdFromEvent() {
    ArgumentCaptor<SettlementRequest> requestCaptor = ArgumentCaptor.forClass(SettlementRequest.class);

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(SettlementResponse.builder().build());
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(settlementService).saveSettlement(requestCaptor.capture());
    SettlementRequest capturedRequest = requestCaptor.getValue();

    assertEquals("e15c19b1-9b44-4db2-9119-9e0df9c08c36", capturedRequest.getClaimId());
  }

  @Test
  void receiveMessage_shouldExtractColorFromAnalyzedFields() {
    ArgumentCaptor<SettlementRequest> requestCaptor = ArgumentCaptor.forClass(SettlementRequest.class);

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(SettlementResponse.builder().build());
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(settlementService).saveSettlement(requestCaptor.capture());
    SettlementRequest capturedRequest = requestCaptor.getValue();

    assertEquals("red", capturedRequest.getColor());
  }

  @Test
  void receiveMessage_shouldExtractDamageFromAnalyzedFields() {
    ArgumentCaptor<SettlementRequest> requestCaptor = ArgumentCaptor.forClass(SettlementRequest.class);

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(SettlementResponse.builder().build());
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(settlementService).saveSettlement(requestCaptor.capture());
    SettlementRequest capturedRequest = requestCaptor.getValue();

    assertEquals("bumper_dent", capturedRequest.getDamage());
  }

  @Test
  void receiveMessage_shouldPublishSettlementFinalizedEvent() {
    ArgumentCaptor<PutEventsRequest> eventCaptor = ArgumentCaptor.forClass(PutEventsRequest.class);

    SettlementResponse mockResponse = SettlementResponse.builder()
      .settlementId("SETTLE-002")
      .customerId("cust-id")
      .claimId("claim-id")
      .settlementMessage("Your settlement is ready")
      .build();

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(mockResponse);
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(eventBridgeClient).putEvents(eventCaptor.capture());
    PutEventsRequest capturedEvent = eventCaptor.getValue();

    assertEquals(1, capturedEvent.entries().size());
    assertEquals("Settlement.Finalized", capturedEvent.entries().get(0).detailType());
    assertEquals("settlement.service", capturedEvent.entries().get(0).source());
    assertEquals("test-event-bus", capturedEvent.entries().get(0).eventBusName());
  }

  @Test
  void receiveMessage_shouldIncludeSettlementResponseInEventDetail() throws Exception {
    ArgumentCaptor<PutEventsRequest> eventCaptor = ArgumentCaptor.forClass(PutEventsRequest.class);
    ObjectMapper objectMapper = new ObjectMapper();

    SettlementResponse mockResponse = SettlementResponse.builder()
      .settlementId("SETTLE-003")
      .customerId("customer-123")
      .claimId("claim-456")
      .settlementMessage("Settlement complete")
      .build();

    when(settlementService.saveSettlement(any(SettlementRequest.class)))
      .thenReturn(mockResponse);
    when(eventBridgeClient.putEvents(any(PutEventsRequest.class)))
      .thenReturn(PutEventsResponse.builder().build());

    subscriberService.receiveMessage(testEventJson);

    verify(eventBridgeClient).putEvents(eventCaptor.capture());
    String detail = eventCaptor.getValue().entries().get(0).detail();

    SettlementResponse parsedResponse = objectMapper.readValue(detail, SettlementResponse.class);
    assertEquals("SETTLE-003", parsedResponse.getSettlementId());
    assertEquals("customer-123", parsedResponse.getCustomerId());
    assertEquals("claim-456", parsedResponse.getClaimId());
  }

  @Test
  void receiveMessage_shouldThrowRuntimeExceptionOnInvalidJson() {
    String invalidJson = "{ invalid json }";

    assertThrows(RuntimeException.class, () -> {
      subscriberService.receiveMessage(invalidJson);
    });
  }
}
