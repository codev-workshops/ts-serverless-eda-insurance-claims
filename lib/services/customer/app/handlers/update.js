// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Customer Update Lambda Handler
 *
 * This Lambda function updates customer records with analyzed document data.
 * It is triggered by EventBridge when document analysis (Textract/Rekognition)
 * completes and fraud checks pass. The function stores the extracted data
 * in DynamoDB and publishes a Customer.Document.Updated event.
 *
 * Event Flow:
 * Fraud.Not.Detected (DRIVERS_LICENSE) -> This Lambda -> DynamoDB update
 *                                                     -> EventBridge (Customer.Document.Updated)
 *
 * Environment Variables:
 * - CUSTOMER_TABLE_NAME: DynamoDB table for customer data
 * - BUS_NAME: EventBridge bus name for publishing events
 * - AWS_REGION: AWS region for service clients
 */

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const docClient = new DynamoDBClient();

/**
 * Lambda handler for updating customer records with document analysis results.
 *
 * @param {Object} event - EventBridge event containing document analysis data
 * @param {Object} event.detail - Event payload with customer and document info
 * @param {string} event.detail.customerId - Customer identifier
 * @param {Object} event.detail.analyzedFieldAndValues - Extracted document fields
 * @param {string} event.detail.documentType - Type of document (e.g., DRIVERS_LICENSE)
 * @param {Object} context - Lambda context object
 * @returns {Object} Response with status code and message
 */
exports.handler = async function (event, context) {
  const {
    detail: { customerId, analyzedFieldAndValues, documentType },
  } = event;

  try {
    const params = {
      TableName: process.env.CUSTOMER_TABLE_NAME,
      Item: marshall({
        PK: customerId,
        SK: `${documentType}`,
        ...analyzedFieldAndValues,
      }),
    };

    const result = await docClient.send(new PutItemCommand(params));

    const command = new PutEventsCommand({
      Entries: [
        {
          DetailType: "Customer.Document.Updated",
          Source: "customer.service",
          EventBusName: process.env.BUS_NAME,
          Detail: JSON.stringify({
            customerId,
            documentType,
          }),
        },
      ],
    });

    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 201,
    body: "Customer Document Updated",
  };
};
