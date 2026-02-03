// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.repository.SettlementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SettlementServiceTest {

  @Mock
  private SettlementRepository settlementRepository;

  private SettlementService settlementService;

  @BeforeEach
  void setUp() {
    settlementService = new SettlementService(settlementRepository);
  }

  @Test
  void saveSettlement_shouldReturnSettlementResponse() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("CUST-123")
      .claimId("CLAIM-456")
      .color("red")
      .damage("bumper_dent")
      .build();

    SettlementResponse expectedResponse = SettlementResponse.builder()
      .settlementId("SETTLE-789")
      .customerId("CUST-123")
      .claimId("CLAIM-456")
      .settlementMessage("Based on our analysis on the damage of your car per claim id CLAIM-456, your out-of-pocket expense will be $100.00.")
      .build();

    when(settlementRepository.saveSettlement(eq(request), any(String.class)))
      .thenReturn(expectedResponse);

    SettlementResponse result = settlementService.saveSettlement(request);

    assertNotNull(result);
    assertEquals("CUST-123", result.getCustomerId());
    assertEquals("CLAIM-456", result.getClaimId());
    verify(settlementRepository, times(1)).saveSettlement(eq(request), any(String.class));
  }

  @Test
  void saveSettlement_shouldGenerateCorrectSettlementMessage() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("CUST-ABC")
      .claimId("CLAIM-XYZ")
      .color("blue")
      .damage("scratch")
      .build();

    String expectedMessagePattern = "Based on our analysis on the damage of your car per claim id CLAIM-XYZ, your out-of-pocket expense will be $100.00.";

    when(settlementRepository.saveSettlement(any(), any()))
      .thenAnswer(invocation -> {
        String message = invocation.getArgument(1);
        assertEquals(expectedMessagePattern, message);
        return SettlementResponse.builder()
          .settlementId("test-id")
          .settlementMessage(message)
          .build();
      });

    settlementService.saveSettlement(request);

    verify(settlementRepository).saveSettlement(eq(request), eq(expectedMessagePattern));
  }

  @Test
  void saveSettlement_shouldPassRequestToRepository() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("customer-id")
      .claimId("claim-id")
      .color("green")
      .damage("dent")
      .build();

    when(settlementRepository.saveSettlement(any(), any()))
      .thenReturn(SettlementResponse.builder().build());

    settlementService.saveSettlement(request);

    verify(settlementRepository).saveSettlement(eq(request), any(String.class));
  }

  @Test
  void saveSettlement_shouldIncludeClaimIdInMessage() {
    String claimId = "UNIQUE-CLAIM-12345";
    SettlementRequest request = SettlementRequest.builder()
      .customerId("cust")
      .claimId(claimId)
      .color("white")
      .damage("crack")
      .build();

    when(settlementRepository.saveSettlement(any(), any()))
      .thenAnswer(invocation -> {
        String message = invocation.getArgument(1);
        assertTrue(message.contains(claimId), "Settlement message should contain claim ID");
        return SettlementResponse.builder().build();
      });

    settlementService.saveSettlement(request);
  }

  @Test
  void saveSettlement_shouldIncludeExpenseAmountInMessage() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("cust")
      .claimId("claim")
      .color("black")
      .damage("major")
      .build();

    when(settlementRepository.saveSettlement(any(), any()))
      .thenAnswer(invocation -> {
        String message = invocation.getArgument(1);
        assertTrue(message.contains("$100.00"), "Settlement message should contain expense amount");
        return SettlementResponse.builder().build();
      });

    settlementService.saveSettlement(request);
  }
}
