// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * IoT Policy Attachment Lambda Handler
 *
 * This Lambda function attaches an IoT policy to a user's Cognito Identity,
 * enabling them to subscribe to IoT topics for real-time notifications.
 * It is called during customer signup to grant the necessary permissions
 * for the frontend to receive WebSocket messages via AWS IoT Core.
 *
 * The IoT policy defines what topics the user can subscribe to and publish to.
 * In this application, users subscribe to their own Cognito Identity ID topic
 * to receive personalized notifications about their claims processing status.
 *
 * Environment Variables:
 * - IOT_POLICY_NAME: Name of the IoT policy to attach
 * - AWS_REGION: AWS region for the IoT client
 */

import { Logger } from "@aws-lambda-powertools/logger";
import { AttachPolicyCommand, IoTClient } from "@aws-sdk/client-iot";

const logger = new Logger({ serviceName: "updateIOTPolicy" });
const iotClient = new IoTClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for attaching IoT policies to Cognito identities.
 *
 * @param {Object} event - API Gateway proxy event
 * @param {Object} event.requestContext.identity - Contains cognitoIdentityId
 * @returns {Object} API Gateway response with 204 status code
 */
exports.handler = async function (event) {
  logger.info("event = ", JSON.stringify(event));

  const input = {
    policyName: process.env.IOT_POLICY_NAME,
    target: event.requestContext.identity.cognitoIdentityId,
  };

  const command = new AttachPolicyCommand(input);
  await iotClient.send(command);
  const resp = {};

  return {
    statusCode: 204,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
