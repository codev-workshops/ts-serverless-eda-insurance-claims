// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Get Customer Lambda Handler
 *
 * This Lambda function retrieves customer details and associated insurance policies
 * for the authenticated user. It performs a multi-step query process:
 * 1. Find the customer record by Cognito Identity ID
 * 2. Query all customer details using the customer's primary key
 * 3. Retrieve associated insurance policies
 *
 * Environment Variables:
 * - CUSTOMER_TABLE_NAME: DynamoDB table storing customer data
 * - POLICY_TABLE_NAME: DynamoDB table storing policy data
 * - AWS_REGION: AWS region for the DynamoDB client
 */

const {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for retrieving customer information.
 *
 * @param {Object} event - API Gateway proxy event
 * @param {Object} event.requestContext.identity - Contains cognitoIdentityId for user lookup
 * @param {Object} context - Lambda context object
 * @returns {Object} API Gateway response with customer details and policies
 */
exports.handler = async function (event, context) {
  const findCustomerParams = {
    FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
    ExpressionAttributeValues: {
      ":sk": { S: "COGNITO_IDENTITY_ID" },
      ":identifier": { S: event.requestContext.identity.cognitoIdentityId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  let custDetails = {};
  const { Items: idRecord } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecord && idRecord.length > 0) {
    const uItem = unmarshall(idRecord["0"]);
    const PK = uItem.PK;

    const getCustDetailsParams = {
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: PK },
      },
      TableName: process.env.CUSTOMER_TABLE_NAME,
    };

    const { Items: customerRecords } = await ddbClient.send(
      new QueryCommand(getCustDetailsParams)
    );

    customerRecords.forEach((customerRecord) => {
      const uCustRec = unmarshall(customerRecord);
      if (uCustRec.SK !== "COGNITO_IDENTITY_ID") {
        custDetails = uCustRec;
      }
    });

    const getPoliciesParams = {
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": { S: `Customer|${custDetails.PK}` },
      },
      TableName: process.env.POLICY_TABLE_NAME,
    };

    const { Items: policies } = await ddbClient.send(
      new ScanCommand(getPoliciesParams)
    );

    custDetails["policies"] = policies;
  }
  return {
    statusCode: 200,
    body: JSON.stringify(custDetails),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
