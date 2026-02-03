// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Customer Signup Lambda Handler
 *
 * This Lambda function handles customer registration requests from the frontend.
 * It receives signup data via API Gateway and publishes a Customer.Submitted event
 * to EventBridge, which triggers the customer creation workflow.
 *
 * Event Flow:
 * Frontend -> API Gateway -> This Lambda -> EventBridge (Customer.Submitted)
 *                                                    -> Step Functions workflow
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
 * Lambda handler for customer signup requests.
 *
 * @param {Object} event - API Gateway proxy event containing signup form data
 * @param {string} event.body - JSON string with customer registration data
 * @param {Object} event.requestContext.identity - Cognito identity information
 * @returns {Object} API Gateway response with status code and message
 */
exports.handler = async function (event) {
  console.log("event --> ", event);

  const message = {
    data: JSON.parse(event.body),
    cognitoIdentityId: event.requestContext.identity.cognitoIdentityId,
  };

  console.log("message = ", message);

  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Customer.Submitted",
        Source: "signup.service",
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify(message),
      },
    ],
  });

  try {
    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  const resp = { message: "Customer Submitted" };

  return {
    statusCode: 200,
    body: JSON.stringify(resp),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
