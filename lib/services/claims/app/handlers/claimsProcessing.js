// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Claims Processing Lambda Handler
 *
 * This Lambda function processes insurance claims submitted via FNOL. It performs
 * comprehensive validation of the claim data before accepting or rejecting it.
 *
 * Processing Steps:
 * 1. Parse claim data from SQS message (originally from EventBridge)
 * 2. Validate policy dates (incident must occur within policy active period)
 * 3. Verify personal information (driver's license number must match records)
 * 4. Persist claim data to DynamoDB if validation passes
 * 5. Generate pre-signed S3 URL for damage photo upload
 * 6. Publish Claim.Accepted or Claim.Rejected event to EventBridge
 *
 * Event Flow:
 * EventBridge (Claim.Requested) -> SQS -> This Lambda -> DynamoDB
 *                                                     -> S3 (pre-signed URL)
 *                                                     -> EventBridge (Claim.Accepted/Rejected)
 *
 * Environment Variables:
 * - POLICY_TABLE_NAME: DynamoDB table for policy data
 * - CUSTOMER_TABLE_NAME: DynamoDB table for customer data
 * - CLAIMS_TABLE_NAME: DynamoDB table for claims data
 * - BUCKET_NAME: S3 bucket for document storage
 * - BUS_NAME: EventBridge bus name
 * - AWS_REGION: AWS region for service clients
 */

const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const crypto = require("crypto");
const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for processing insurance claims.
 *
 * @param {Object} event - SQS event containing claim data from EventBridge
 * @param {Array} event.Records - Array of SQS messages
 * @param {Object} context - Lambda context object
 * @returns {Object} Response with status code and message
 */
exports.handler = async function (event, context) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Claims Processing Lambda Function Called");

  try {
    const {
      "detail-type": detailType,
      detail: {
        incident: {
          occurrenceDateTime,
          fnolDateTime,
          location: { country, state, city, zip, road },
          description,
        },
        policy: { id },
        personalInformation: {
          customerId,
          driversLicenseNumber,
          isInsurerDriver,
          licensePlateNumber,
          numberOfPassengers,
        },
        policeReport: { isFiled, reportOrReceiptAvailable },
        otherParty: { insuranceId, insuranceCompany, firstName, lastName },
      },
    } = JSON.parse(event.Records[0].body);

    if (detailType !== "Claim.Requested") {
      console.log("Unsupported Detail Type: " + event.detailType);
      return;
    }

    const eventPayload = {
      source: "claims.service",
      detailType: "",
      detail: { customerId },
    };

    // Get Policies from customer Id
    const queryCommand = new GetItemCommand({
      TableName: process.env.POLICY_TABLE_NAME,
      Key: marshall({
        PK: id,
        SK: `Customer|${customerId}`,
      }),
    });

    const { Item } = await docClient.send(queryCommand);
    console.log("Results from DDB Query: " + JSON.stringify(Item));

    const policy = unmarshall(Item);
    console.log("Policies from FNOL data: " + JSON.stringify(policy));

    const policyStartDate = new Date(policy.startDate);
    const policyEndDate = new Date(policy.endDate);
    const incidentDate = new Date(occurrenceDateTime);
    const isValidPolicy =
      policyStartDate < incidentDate && incidentDate < policyEndDate;

    if (!isValidPolicy) {
      eventPayload.detailType = "Claim.Rejected";
      eventPayload.detail = {
        ...eventPayload.detail,
        message:
          "Policy provided for customer does not match or the incident happened outside policy active period",
      };

      await putEvents(eventPayload);
      return;
    }

    const isValidPersonalInformation = await verifyPersonalInformation(
      customerId,
      driversLicenseNumber
    );

    if (!isValidPersonalInformation) {
      eventPayload.detailType = "Claim.Rejected";
      eventPayload.detail = {
        ...eventPayload.detail,
        message: "Personal information (Driver's License) does not match",
      };

      await putEvents(eventPayload);
      return;
    }

    const claimId = crypto.randomUUID();

    // Else persist Claims information
    const claimPutItemCommand = new PutItemCommand({
      TableName: process.env.CLAIMS_TABLE_NAME,
      Item: marshall({
        PK: claimId,
        SK: `Customer|${customerId}`,
        occurrenceDateTime,
        fnolDateTime,
        country,
        state,
        city,
        zip,
        road,
        description,
        driversLicenseNumber,
        isInsurerDriver,
        licensePlateNumber,
        numberOfPassengers,
        policeReportFiled: isFiled,
        policeReportReceiptAvailable: reportOrReceiptAvailable,
        otherPartyInsuranceId: insuranceId,
        otherPartyInsuranceCompany: insuranceCompany,
        otherPartyFirstName: firstName,
        otherPartyLastName: lastName,
        policyId: id,
      }),
    });

    const result = await docClient.send(claimPutItemCommand);

    //Create pre-signed url to upload car damage pictures
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `customers/${customerId}/documents/claims/${claimId}/damagedCar.jpg`,
      ContentType: "application/jpg",
    });

    const uploadCarDamageUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600,
    });

    eventPayload.detailType = "Claim.Accepted";
    eventPayload.detail = {
      ...eventPayload.detail,
      claimId,
      uploadCarDamageUrl,
      message: "Claim Information has been accepted",
    };

    await putEvents(eventPayload);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 201,
    body: "Claim Accepted",
  };
};

/**
 * Publishes an event to EventBridge with the specified payload.
 *
 * @param {Object} eventPayload - Event data to publish
 * @param {string} eventPayload.source - Event source identifier
 * @param {string} eventPayload.detailType - Event detail type (e.g., Claim.Accepted)
 * @param {Object} eventPayload.detail - Event payload data
 * @returns {Promise} EventBridge PutEvents response
 */
async function putEvents(eventPayload) {
  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        DetailType: eventPayload.detailType,
        Source: eventPayload.source,
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify(eventPayload.detail),
      },
    ],
  });

  return await ebClient.send(putEventsCommand);
}

/**
 * Verifies that the driver's license number provided in the claim matches
 * the driver's license on file for the customer.
 *
 * @param {string} customerId - Customer identifier
 * @param {string} driversLicenseNumber - Driver's license number from claim
 * @returns {Promise<boolean>} True if license numbers match, false otherwise
 */
async function verifyPersonalInformation(customerId, driversLicenseNumber) {
  const customerDocumentCommand = new GetItemCommand({
    TableName: process.env.CUSTOMER_TABLE_NAME,
    Key: marshall({
      PK: customerId,
      SK: "DRIVERS_LICENSE",
    }),
    ProjectionExpression: "DOCUMENT_NUMBER",
  });

  const { Item } = await docClient.send(customerDocumentCommand);
  let item;
  if (Item) item = unmarshall(Item);
  console.log("Drivers License from Customer Table: " + JSON.stringify(item));

  return (
    item &&
    driversLicenseNumber &&
    item.DOCUMENT_NUMBER === driversLicenseNumber
  );
}
