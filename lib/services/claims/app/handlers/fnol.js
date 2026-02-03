// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * First Notice of Loss (FNOL) Lambda Handler
 *
 * This Lambda function handles the initial claim submission from customers.
 * FNOL is the first report made to an insurance company after an incident occurs.
 * The function receives claim data via API Gateway and publishes a Claim.Requested
 * event to EventBridge, which triggers the claims processing workflow.
 *
 * Event Flow:
 * Frontend -> API Gateway -> This Lambda -> EventBridge (Claim.Requested)
 *                                                    -> SQS -> Claims Processing Lambda
 *
 * Environment Variables:
 * - BUS_NAME: Name of the EventBridge bus to publish events to
 * - AWS_REGION: AWS region for the EventBridge client
 */

const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for FNOL (First Notice of Loss) submissions.
 *
 * @param {Object} event - API Gateway proxy event containing claim data
 * @param {string} event.body - JSON string with incident, policy, and personal information
 * @returns {Object} API Gateway response with status code and message
 */
exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  console.log("FNOL Lambda Function Called");

  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Claim.Requested",
        Source: "fnol.service",
        EventBusName: process.env.BUS_NAME,
        Detail: event.body,
      },
    ],
  });

  try {
    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: "Claim Requested",
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
