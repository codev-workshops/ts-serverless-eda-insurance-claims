// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.repository;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.http.SdkHttpResponse;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SettlementRepositoryTest {

  @Mock
  private DynamoDbClient dynamoDbClient;

  private SettlementRepository settlementRepository;

  @BeforeEach
  void setUp() {
    settlementRepository = new SettlementRepository(dynamoDbClient);
    ReflectionTestUtils.setField(settlementRepository, "tableName", "test-settlement-table");
  }

  @Test
  void saveSettlement_shouldReturnSettlementResponse() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("CUST-123")
      .claimId("CLAIM-456")
      .color("red")
      .damage("bumper_dent")
      .build();

    String settlementMessage = "Your settlement is $100.00";

    PutItemResponse mockResponse = PutItemResponse.builder()
      .sdkHttpResponse(SdkHttpResponse.builder().statusCode(200).build())
      .build();

    when(dynamoDbClient.putItem(any(PutItemRequest.class))).thenReturn(mockResponse);

    SettlementResponse result = settlementRepository.saveSettlement(request, settlementMessage);

    assertNotNull(result);
    assertNotNull(result.getSettlementId());
    assertEquals("CUST-123", result.getCustomerId());
    assertEquals("CLAIM-456", result.getClaimId());
    assertEquals(settlementMessage, result.getSettlementMessage());
  }

  @Test
  void saveSettlement_shouldGenerateUniqueSettlementId() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("cust")
      .claimId("claim")
      .color("blue")
      .damage("scratch")
      .build();

    PutItemResponse mockResponse = PutItemResponse.builder()
      .sdkHttpResponse(SdkHttpResponse.builder().statusCode(200).build())
      .build();

    when(dynamoDbClient.putItem(any(PutItemRequest.class))).thenReturn(mockResponse);

    SettlementResponse result1 = settlementRepository.saveSettlement(request, "msg1");
    SettlementResponse result2 = settlementRepository.saveSettlement(request, "msg2");

    assertNotNull(result1.getSettlementId());
    assertNotNull(result2.getSettlementId());
    assertNotEquals(result1.getSettlementId(), result2.getSettlementId());
  }

  @Test
  void saveSettlement_shouldStoreCorrectAttributesInDynamoDB() {
    ArgumentCaptor<PutItemRequest> requestCaptor = ArgumentCaptor.forClass(PutItemRequest.class);

    SettlementRequest request = SettlementRequest.builder()
      .customerId("customer-id-123")
      .claimId("claim-id-456")
      .color("green")
      .damage("dent")
      .build();

    String settlementMessage = "Settlement processed successfully";

    PutItemResponse mockResponse = PutItemResponse.builder()
      .sdkHttpResponse(SdkHttpResponse.builder().statusCode(200).build())
      .build();

    when(dynamoDbClient.putItem(any(PutItemRequest.class))).thenReturn(mockResponse);

    settlementRepository.saveSettlement(request, settlementMessage);

    verify(dynamoDbClient).putItem(requestCaptor.capture());
    PutItemRequest capturedRequest = requestCaptor.getValue();

    assertEquals("test-settlement-table", capturedRequest.tableName());

    Map<String, AttributeValue> item = capturedRequest.item();
    assertNotNull(item.get("Id"));
    assertEquals("customer-id-123", item.get("customerId").s());
    assertEquals("claim-id-456", item.get("claimId").s());
    assertEquals("green", item.get("color").s());
    assertEquals("dent", item.get("damage").s());
    assertEquals(settlementMessage, item.get("settlementMessage").s());
  }

  @Test
  void saveSettlement_shouldUseConfiguredTableName() {
    ArgumentCaptor<PutItemRequest> requestCaptor = ArgumentCaptor.forClass(PutItemRequest.class);

    ReflectionTestUtils.setField(settlementRepository, "tableName", "custom-table-name");

    SettlementRequest request = SettlementRequest.builder()
      .customerId("cust")
      .claimId("claim")
      .color("white")
      .damage("crack")
      .build();

    PutItemResponse mockResponse = PutItemResponse.builder()
      .sdkHttpResponse(SdkHttpResponse.builder().statusCode(200).build())
      .build();

    when(dynamoDbClient.putItem(any(PutItemRequest.class))).thenReturn(mockResponse);

    settlementRepository.saveSettlement(request, "message");

    verify(dynamoDbClient).putItem(requestCaptor.capture());
    assertEquals("custom-table-name", requestCaptor.getValue().tableName());
  }

  @Test
  void saveSettlement_shouldCallDynamoDbClientOnce() {
    SettlementRequest request = SettlementRequest.builder()
      .customerId("cust")
      .claimId("claim")
      .color("black")
      .damage("major")
      .build();

    PutItemResponse mockResponse = PutItemResponse.builder()
      .sdkHttpResponse(SdkHttpResponse.builder().statusCode(200).build())
      .build();

    when(dynamoDbClient.putItem(any(PutItemRequest.class))).thenReturn(mockResponse);

    settlementRepository.saveSettlement(request, "test message");

    verify(dynamoDbClient, times(1)).putItem(any(PutItemRequest.class));
  }
}
