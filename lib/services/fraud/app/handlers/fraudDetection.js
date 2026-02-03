// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Fraud Detection Lambda Handler
 *
 * This Lambda function performs fraud detection on processed documents.
 * It validates data consistency between submitted information and analyzed documents
 * to identify potential fraudulent claims.
 *
 * Fraud Detection Types:
 * 1. Identity Fraud (DRIVERS_LICENSE): Compares the first name on the registration
 *    form with the first name extracted from the driver's license via Textract.
 * 2. Asset Fraud (CAR): Verifies that the vehicle color detected in photos matches
 *    the color recorded in the insurance policy.
 *
 * Event Flow:
 * Document.Processed -> This Lambda -> Fraud.Detected OR Fraud.Not.Detected
 *
 * Environment Variables:
 * - CUSTOMER_TABLE_NAME: DynamoDB table for customer data
 * - POLICY_TABLE_NAME: DynamoDB table for policy data
 * - CLAIMS_TABLE_NAME: DynamoDB table for claims data
 * - BUS_NAME: EventBridge bus name
 * - AWS_REGION: AWS region for service clients
 */

const {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for fraud detection on processed documents.
 *
 * @param {Object} event - EventBridge event containing document analysis results
 * @param {Object} event.detail - Event payload with document type and analysis data
 * @param {string} event.detail.documentType - Type of document (DRIVERS_LICENSE or CAR)
 * @returns {string} Confirmation message
 */
exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  const { documentType } = event.detail;

  switch (documentType) {
    case "DRIVERS_LICENSE":
      await checkIdentityFraud(event.detail);
      break;
    case "CAR":
      await checkInsuredAssetFraud(event.detail);
      break;
    default:
      break;
  }

  return "Fraud Detection Lambda called";
};

/**
 * Checks for identity fraud by comparing customer registration data with
 * driver's license information extracted via Textract.
 *
 * @param {Object} params - Document analysis data
 * @param {string} params.customerId - Customer identifier
 * @param {Object} params.analyzedFieldAndValues - Extracted fields from driver's license
 * @param {string} params.documentType - Document type (DRIVERS_LICENSE)
 */
async function checkIdentityFraud({
  customerId,
  analyzedFieldAndValues,
  documentType,
}) {
  let fraud = {},
    putEventsCommand;

  const params = {
    KeyConditionExpression: "PK = :s",
    ExpressionAttributeValues: {
      ":s": { S: customerId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  try {
    const { Items } = await ddbClient.send(new QueryCommand(params));

    let item;
    for (let index = 0; index < Items.length; index++) {
      const iterItem = Items[index];
      if (iterItem.firstname) {
        item = unmarshall(iterItem);
        break;
      }
    }

    console.log("GetItem from DB: " + JSON.stringify(item));

    fraud.isDetected =
      item?.firstname &&
      analyzedFieldAndValues?.FIRST_NAME &&
      item.firstname?.toLowerCase() !==
        analyzedFieldAndValues.FIRST_NAME?.toLowerCase();

    if (fraud.isDetected) {
      fraud.reason =
        "First Name provided does not match with First Name in Driver's License";
    }

    console.log("Fraud Detection Object: " + JSON.stringify(fraud, 2, null));

    if (fraud.isDetected) {
      putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            DetailType: "Fraud.Detected",
            Source: "fraud.service",
            EventBusName: process.env.BUS_NAME,
            Detail: JSON.stringify({
              customerId,
              documentType,
              fraudType: "DOCUMENT",
              fraudReason: fraud.reason,
            }),
          },
        ],
      });
    } else {
      putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            DetailType: "Fraud.Not.Detected",
            Source: "fraud.service",
            EventBusName: process.env.BUS_NAME,
            Detail: JSON.stringify({
              customerId,
              documentType,
              analyzedFieldAndValues,
              fraudType: "DOCUMENT",
            }),
          },
        ],
      });
    }

    await ebClient.send(putEventsCommand);
  } catch (e) {
    console.log(e);
  }
}

/**
 * Checks for insured asset fraud by verifying vehicle information.
 * For signup: Compares detected vehicle color with policy color.
 * For claims: Verifies damage detection and color consistency.
 *
 * @param {Object} params - Document analysis data
 * @param {string} params.customerId - Customer identifier
 * @param {string} params.recordId - Policy ID (signup) or Claim ID (claims)
 * @param {Object} params.analyzedFieldAndValues - Detected color and damage info
 * @param {string} params.documentType - Document type (CAR)
 */
async function checkInsuredAssetFraud({
  customerId,
  recordId,
  analyzedFieldAndValues,
  documentType,
}) {
  let fraudReason;

  if (analyzedFieldAndValues && analyzedFieldAndValues.type === "claims") {
    fraudReason = "No damage detected.";
    fraudReason = await checkClaimsFraud(
      customerId,
      recordId,
      analyzedFieldAndValues,
      fraudReason
    );
    await publishInsuredAssetFraudResult({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudReason,
      fraudType: "CLAIMS",
    });
  } else if (analyzedFieldAndValues.type === "signup") {
    const policy = await getPolicyRecord(recordId, customerId);
    fraudReason = matchColor(analyzedFieldAndValues.color, policy);
    await publishInsuredAssetFraudResult({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudReason,
      fraudType: "SIGNUP.CAR",
    });
  }
}

/**
 * Performs fraud checks specific to claims by verifying damage detection
 * and vehicle color consistency with policy records.
 *
 * @param {string} customerId - Customer identifier
 * @param {string} claimId - Claim identifier
 * @param {Object} analysisData - Damage and color detection results
 * @param {Object} analysisData.damage - Damage detection result
 * @param {Object} analysisData.color - Color detection result
 * @param {string} fraudReason - Initial fraud reason (if any)
 * @returns {Promise<string|undefined>} Fraud reason if detected, undefined otherwise
 */
async function checkClaimsFraud(
  customerId,
  claimId,
  { damage, color },
  fraudReason
) {
  if (damage && damage.Name !== "unknown") {
    const claimRecord = await getClaimRecord(claimId, customerId);
    const policy = await getPolicyRecord(claimRecord.policyId, customerId);
    fraudReason = matchColor(color, policy);
  }
  return fraudReason;
}

/**
 * Publishes the fraud detection result for insured asset checks to EventBridge.
 *
 * @param {Object} params - Fraud check result data
 * @param {string} params.customerId - Customer identifier
 * @param {string} params.recordId - Policy or Claim ID
 * @param {string} params.documentType - Document type
 * @param {Object} params.analyzedFieldAndValues - Analysis results
 * @param {string|undefined} params.fraudReason - Reason if fraud detected
 * @param {string} params.fraudType - Type of fraud check (SIGNUP.CAR or CLAIMS)
 */
async function publishInsuredAssetFraudResult({
  customerId,
  recordId,
  documentType,
  analyzedFieldAndValues,
  fraudReason,
  fraudType,
}) {
  let entry = {
    DetailType: "Fraud.Not.Detected",
    Source: "fraud.service",
    EventBusName: process.env.BUS_NAME,
    Detail: JSON.stringify({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudType,
    }),
  };

  if (fraudReason) {
    entry.DetailType = "Fraud.Detected";
    entry.Detail = JSON.stringify({
      customerId,
      recordId,
      documentType,
      fraudType,
      fraudReason,
    });
  }

  let putEventsCommand = new PutEventsCommand({
    Entries: [entry],
  });

  await ebClient.send(putEventsCommand);
}

/**
 * Compares detected vehicle color with the color recorded in the policy.
 *
 * @param {Object} color - Detected color from image analysis
 * @param {string} color.Name - Color name (e.g., "green", "red")
 * @param {Object} policy - Policy record from DynamoDB
 * @param {string} policy.color - Expected vehicle color from policy
 * @returns {string|undefined} Fraud reason if colors don't match, undefined otherwise
 */
function matchColor(color, policy) {
  let fraudReason;

  if (
    !color ||
    !color.Name ||
    color.Name.toLowerCase() !== policy.color.toLowerCase()
  ) {
    fraudReason = "Color of vehicle doesn't match the color on the policy.";
  }

  return fraudReason;
}

/**
 * Retrieves a policy record from DynamoDB.
 *
 * @param {string} policyId - Policy identifier
 * @param {string} customerId - Customer identifier
 * @returns {Promise<Object>} Policy record
 */
async function getPolicyRecord(policyId, customerId) {
  const getPolicyParams = {
    Key: {
      PK: { S: policyId },
      SK: { S: `Customer|${customerId}` },
    },
    TableName: process.env.POLICY_TABLE_NAME,
  };

  const { Item: policyItem } = await ddbClient.send(
    new GetItemCommand(getPolicyParams)
  );

  const policy = unmarshall(policyItem);
  return policy;
}

/**
 * Retrieves a claim record from DynamoDB.
 *
 * @param {string} claimId - Claim identifier
 * @param {string} customerId - Customer identifier
 * @returns {Promise<Object>} Claim record
 */
async function getClaimRecord(claimId, customerId) {
  const getClaimsParams = {
    Key: {
      PK: { S: claimId },
      SK: { S: `Customer|${customerId}` },
    },
    TableName: process.env.CLAIMS_TABLE_NAME,
  };

  const { Item: claimsItem } = await ddbClient.send(
    new GetItemCommand(getClaimsParams)
  );

  const claimRecord = unmarshall(claimsItem);
  return claimRecord;
}
