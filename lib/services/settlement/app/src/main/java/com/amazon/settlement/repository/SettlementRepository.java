// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.repository;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.Map;
import java.util.UUID;

/**
 * Settlement Repository
 *
 * Data access layer for persisting settlement records to Amazon DynamoDB.
 * This repository handles the storage of settlement details including
 * customer ID, claim ID, settlement message, and vehicle analysis results.
 *
 * DynamoDB Table Schema:
 * - Id (String): Unique settlement identifier (UUID)
 * - customerId (String): Customer identifier
 * - claimId (String): Associated claim identifier
 * - settlementMessage (String): Customer-facing settlement message
 * - color (String): Detected vehicle color
 * - damage (String): Detected damage type
 */
@Slf4j
@Repository
public class SettlementRepository {

  /** DynamoDB table name, injected from application properties */
  @Value("${dynamodb.table.name}")
  private String tableName;

  private final DynamoDbClient dynamoDbClient;

  /**
   * Constructs a SettlementRepository with the required DynamoDB client.
   *
   * @param dynamoDbClient AWS SDK DynamoDB client for database operations
   */
  public SettlementRepository(DynamoDbClient dynamoDbClient) {
    this.dynamoDbClient = dynamoDbClient;
  }

  /**
   * Persists a settlement record to DynamoDB.
   *
   * Creates a new settlement record with a generated UUID and stores all
   * relevant claim and analysis details. Returns a response object containing
   * the settlement ID and message for downstream processing.
   *
   * @param requestCommand Settlement request with claim and customer details
   * @param settlementMessage Customer-facing message describing the settlement
   * @return SettlementResponse with generated settlement ID and details
   */
  public SettlementResponse saveSettlement(
    final SettlementRequest requestCommand,
    final String settlementMessage
  ) {
    log.info("Storing settlement detail: " + requestCommand);

    String uuid = UUID.randomUUID().toString();

    Map<String, AttributeValue> attributes = Map.of(
      "Id", AttributeValue.builder().s(uuid).build(),
      "customerId", AttributeValue.builder().s(requestCommand.getCustomerId()).build(),
      "claimId", AttributeValue.builder().s(requestCommand.getClaimId()).build(),
      "settlementMessage", AttributeValue.builder().s(settlementMessage).build(),
      "color", AttributeValue.builder().s(requestCommand.getColor()).build(),
      "damage", AttributeValue.builder().s(requestCommand.getDamage()).build()
    );

    PutItemRequest populateDataItemRequest = PutItemRequest.builder()
      .tableName(tableName)
      .item(attributes)
      .build();

    PutItemResponse resp = dynamoDbClient.putItem(populateDataItemRequest);
    log.info("Put Item Request status code: " + resp.sdkHttpResponse().statusCode());

    return SettlementResponse.builder()
      .settlementId(uuid)
      .settlementMessage(settlementMessage)
      .customerId(requestCommand.getCustomerId())
      .claimId(requestCommand.getClaimId())
      .build();
  }
}
