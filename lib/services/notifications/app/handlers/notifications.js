// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Notifications Lambda Handler
 *
 * This Lambda function bridges EventBridge events to AWS IoT Core for real-time
 * frontend updates. It subscribes to key business events (customer acceptance,
 * claim status, fraud detection, settlement, etc.) and publishes them to
 * user-specific IoT topics.
 *
 * The React frontend subscribes to these IoT topics using the user's Cognito
 * Identity ID, enabling real-time status updates without polling.
 *
 * Event Flow:
 * EventBridge (various events) -> This Lambda -> AWS IoT Core -> Frontend (WebSocket)
 *
 * Environment Variables:
 * - CUSTOMER_TABLE_NAME: DynamoDB table for looking up Cognito Identity IDs
 * - AWS_REGION: AWS region for IoT and DynamoDB clients
 */

import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const client = new IoTDataPlaneClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for publishing notifications to IoT Core.
 *
 * @param {Object} event - EventBridge event to forward to the frontend
 * @param {Object} event.detail - Event payload containing customer information
 * @param {string} event.detail.cognitoIdentityId - Optional Cognito Identity ID
 * @param {string} event.detail.customerId - Customer ID for identity lookup
 * @returns {string} Confirmation message
 */
exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Notifications Lambda Function Called, event = ", event);

  const { cognitoIdentityId, customerId } = event.detail;
  const identityId = cognitoIdentityId ? cognitoIdentityId : await getIdentityId(customerId);

  const input = {
    payload: JSON.stringify(event),
    topic: identityId,
  };

  const command = new PublishCommand(input);

  try {
    const data = await client.send(command);
    console.log("Published, data = ", data);
  } catch (error) {
    console.log("error while publishing, error = ", error);
  }

  return "Notifications Lambda called";
};

/**
 * Retrieves the Cognito Identity ID for a customer from DynamoDB.
 *
 * @param {string} customerId - Customer identifier
 * @returns {Promise<string>} Cognito Identity ID for the customer
 */
async function getIdentityId(customerId) {
  const customerCognitoCommand = new GetItemCommand({
    TableName: process.env.CUSTOMER_TABLE_NAME,
    Key: marshall(
      {
        PK: customerId,
        SK: "COGNITO_IDENTITY_ID",
      },
      { removeUndefinedValues: true }
    ),
    ProjectionExpression: "cognitoIdentityId",
  });

  const { Item } = await docClient.send(customerCognitoCommand);
  const item = unmarshall(Item);

  return item.cognitoIdentityId;
}
