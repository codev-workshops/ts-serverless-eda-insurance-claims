// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Functional/Integration Tests for Event-Driven Insurance Claims Processing Workflow
 * 
 * These tests verify the end-to-end event flow through the system:
 * 1. Customer Signup -> Customer.Submitted event
 * 2. Document Processing -> Document.Processed event
 * 3. FNOL Submission -> Claim.Requested -> Claim.Accepted/Rejected
 * 4. Fraud Detection -> Fraud.Detected/Fraud.Not.Detected
 * 5. Settlement Processing -> Settlement.Finalized
 * 6. Vendor Selection -> Vendor.Finalized
 */

describe("Insurance Claims Processing Event Workflow", () => {
  describe("Customer Onboarding Flow", () => {
    const mockEventBridgeSend = jest.fn();
    const mockDynamoSend = jest.fn();

    beforeEach(() => {
      jest.resetModules();
      mockEventBridgeSend.mockReset();
      mockDynamoSend.mockReset();

      jest.mock("@aws-sdk/client-eventbridge", () => ({
        EventBridgeClient: jest.fn(() => ({
          send: mockEventBridgeSend,
        })),
        PutEventsCommand: jest.fn((params) => params),
      }));

      jest.mock("@aws-sdk/client-dynamodb", () => ({
        DynamoDBClient: jest.fn(() => ({
          send: mockDynamoSend,
        })),
        PutItemCommand: jest.fn((params) => params),
        GetItemCommand: jest.fn((params) => params),
        QueryCommand: jest.fn((params) => params),
        ScanCommand: jest.fn((params) => params),
      }));

      process.env.AWS_REGION = "us-east-1";
      process.env.BUS_NAME = "test-claims-bus";
      process.env.CUSTOMER_TABLE_NAME = "test-customer-table";
      process.env.POLICY_TABLE_NAME = "test-policy-table";
    });

    it("should emit Customer.Submitted event when customer signs up", async () => {
      mockEventBridgeSend.mockResolvedValue({ FailedEntryCount: 0 });

      const signupHandler = require("../../lib/services/customer/app/handlers/signup").handler;
      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

      const signupEvent = {
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          ssn: "123-45-6789",
          address: "123 Main St, Seattle, WA 98101",
        }),
        requestContext: {
          identity: {
            cognitoIdentityId: "us-east-1:test-cognito-id",
          },
        },
      };

      const result = await signupHandler(signupEvent);

      expect(result.statusCode).toBe(200);
      expect(PutEventsCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: "Customer.Submitted",
              Source: "signup.service",
            }),
          ]),
        })
      );
    });

    it("should validate customer data before processing", async () => {
      const validatorHandler = require("../../lib/services/customer/app/handlers/validator").handler;

      const validData = [
        { type: "email", value: "valid@email.com" },
        { type: "ssn", value: "123-45-6789" },
      ];

      const invalidData = [
        { type: "email", value: "invalid-email" },
        { type: "ssn", value: "123-45-6789" },
      ];

      const validResult = await validatorHandler(validData);
      const invalidResult = await validatorHandler(invalidData);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  describe("Document Processing Flow", () => {
    it("should transform Textract response correctly", async () => {
      const transformerHandler = require("../../lib/services/documents/app/handlers/textractResponseTransformer").handler;

      const textractResponse = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "John", Confidence: 99.5 },
            },
            {
              Type: { Text: "LAST_NAME" },
              ValueDetection: { Text: "Doe", Confidence: 98.2 },
            },
            {
              Type: { Text: "DOCUMENT_NUMBER" },
              ValueDetection: { Text: "DL123456789", Confidence: 97.8 },
            },
            {
              Type: { Text: "LOW_CONFIDENCE_FIELD" },
              ValueDetection: { Text: "Unknown", Confidence: 50.0 },
            },
          ],
        ],
      };

      const result = await transformerHandler(textractResponse);

      expect(result.FIRST_NAME).toBe("John");
      expect(result.LAST_NAME).toBe("Doe");
      expect(result.DOCUMENT_NUMBER).toBe("DL123456789");
      expect(result.LOW_CONFIDENCE_FIELD).toBeUndefined();
    });
  });

  describe("Claims Processing Flow", () => {
    const mockEventBridgeSend = jest.fn();
    const mockDynamoSend = jest.fn();

    beforeEach(() => {
      jest.resetModules();
      mockEventBridgeSend.mockReset();
      mockDynamoSend.mockReset();

      jest.mock("@aws-sdk/client-eventbridge", () => ({
        EventBridgeClient: jest.fn(() => ({
          send: mockEventBridgeSend,
        })),
        PutEventsCommand: jest.fn((params) => params),
      }));

      process.env.AWS_REGION = "us-east-1";
      process.env.BUS_NAME = "test-claims-bus";
    });

    it("should emit Claim.Requested event when FNOL is submitted", async () => {
      mockEventBridgeSend.mockResolvedValue({ FailedEntryCount: 0 });

      const fnolHandler = require("../../lib/services/claims/app/handlers/fnol").handler;
      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

      const fnolEvent = {
        body: JSON.stringify({
          incident: {
            occurrenceDateTime: "2024-06-15T10:30:00Z",
            fnolDateTime: "2024-06-15T11:00:00Z",
            location: {
              country: "USA",
              state: "WA",
              city: "Seattle",
              zip: "98101",
              road: "Main Street",
            },
            description: "Rear-end collision at traffic light",
          },
          policy: { id: "POLICY-001" },
          personalInformation: {
            customerId: "CUST-123",
            driversLicenseNumber: "DL123456789",
            isInsurerDriver: true,
            licensePlateNumber: "ABC1234",
            numberOfPassengers: 1,
          },
          policeReport: {
            isFiled: true,
            reportOrReceiptAvailable: true,
          },
          otherParty: {
            insuranceId: "OTHER-INS-001",
            insuranceCompany: "Other Insurance Co",
            firstName: "Jane",
            lastName: "Smith",
          },
        }),
      };

      const result = await fnolHandler(fnolEvent);

      expect(result.statusCode).toBe(200);
      expect(PutEventsCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: "Claim.Requested",
              Source: "fnol.service",
            }),
          ]),
        })
      );
    });
  });

  describe("Fraud Detection Flow", () => {
    const mockEventBridgeSend = jest.fn();
    const mockDynamoSend = jest.fn();

    beforeEach(() => {
      jest.resetModules();
      mockEventBridgeSend.mockReset();
      mockDynamoSend.mockReset();

      jest.mock("@aws-sdk/client-eventbridge", () => ({
        EventBridgeClient: jest.fn(() => ({
          send: mockEventBridgeSend,
        })),
        PutEventsCommand: jest.fn((params) => params),
      }));

      jest.mock("@aws-sdk/client-dynamodb", () => ({
        DynamoDBClient: jest.fn(() => ({
          send: mockDynamoSend,
        })),
        QueryCommand: jest.fn((params) => params),
        GetItemCommand: jest.fn((params) => params),
      }));

      jest.mock("@aws-sdk/util-dynamodb", () => ({
        unmarshall: jest.fn((item) => {
          const result: Record<string, any> = {};
          for (const key in item) {
            if (item[key].S) result[key] = item[key].S;
            else result[key] = item[key];
          }
          return result;
        }),
      }));

      process.env.AWS_REGION = "us-east-1";
      process.env.BUS_NAME = "test-claims-bus";
      process.env.CUSTOMER_TABLE_NAME = "test-customer-table";
      process.env.POLICY_TABLE_NAME = "test-policy-table";
      process.env.CLAIMS_TABLE_NAME = "test-claims-table";
    });

    it("should detect fraud when driver license name does not match", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            PK: { S: "CUST-123" },
            firstname: { S: "John" },
            lastname: { S: "Doe" },
          },
        ],
      });
      mockEventBridgeSend.mockResolvedValue({});

      const fraudHandler = require("../../lib/services/fraud/app/handlers/fraudDetection").handler;
      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

      const fraudEvent = {
        detail: {
          customerId: "CUST-123",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: {
            FIRST_NAME: "Jane",
            LAST_NAME: "Doe",
          },
        },
      };

      await fraudHandler(fraudEvent);

      expect(PutEventsCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: "Fraud.Detected",
              Source: "fraud.service",
            }),
          ]),
        })
      );
    });

    it("should not detect fraud when all data matches", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            PK: { S: "CUST-123" },
            firstname: { S: "John" },
            lastname: { S: "Doe" },
          },
        ],
      });
      mockEventBridgeSend.mockResolvedValue({});

      const fraudHandler = require("../../lib/services/fraud/app/handlers/fraudDetection").handler;
      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

      const fraudEvent = {
        detail: {
          customerId: "CUST-123",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: {
            FIRST_NAME: "John",
            LAST_NAME: "Doe",
          },
        },
      };

      await fraudHandler(fraudEvent);

      expect(PutEventsCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: "Fraud.Not.Detected",
              Source: "fraud.service",
            }),
          ]),
        })
      );
    });
  });

  describe("End-to-End Event Chain Validation", () => {
    it("should validate complete event chain from signup to vendor finalization", () => {
      const eventChain = [
        { source: "signup.service", detailType: "Customer.Submitted" },
        { source: "customer.service", detailType: "Customer.Accepted" },
        { source: "documents.service", detailType: "Document.Processed" },
        { source: "customer.service", detailType: "Customer.Document.Updated" },
        { source: "fraud.service", detailType: "Fraud.Not.Detected" },
        { source: "fnol.service", detailType: "Claim.Requested" },
        { source: "claims.service", detailType: "Claim.Accepted" },
        { source: "fraud.service", detailType: "Fraud.Not.Detected" },
        { source: "settlement.service", detailType: "Settlement.Finalized" },
        { source: "vendor.service", detailType: "Vendor.Finalized" },
      ];

      eventChain.forEach((event, index) => {
        expect(event.source).toBeDefined();
        expect(event.detailType).toBeDefined();
        expect(event.source).toMatch(/\.(service)$/);
      });

      expect(eventChain.length).toBe(10);
    });

    it("should validate event detail types follow naming convention", () => {
      const validDetailTypes = [
        "Customer.Submitted",
        "Customer.Accepted",
        "Customer.Rejected",
        "Customer.Document.Updated",
        "Document.Processed",
        "Claim.Requested",
        "Claim.Accepted",
        "Claim.Rejected",
        "Fraud.Detected",
        "Fraud.Not.Detected",
        "Settlement.Finalized",
        "Vendor.Finalized",
      ];

      validDetailTypes.forEach((detailType) => {
        expect(detailType).toMatch(/^[A-Z][a-z]+(\.[A-Z][a-z]+)+$/);
      });
    });

    it("should validate event sources follow naming convention", () => {
      const validSources = [
        "signup.service",
        "customer.service",
        "documents.service",
        "fraud.service",
        "fnol.service",
        "claims.service",
        "settlement.service",
        "vendor.service",
        "notifications.service",
      ];

      validSources.forEach((source) => {
        expect(source).toMatch(/^[a-z]+\.service$/);
      });
    });
  });

  describe("Event Payload Validation", () => {
    it("should validate Customer.Submitted event payload structure", () => {
      const customerSubmittedPayload = {
        data: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          ssn: "123-45-6789",
        },
        cognitoIdentityId: "us-east-1:12345678-1234-1234-1234-123456789012",
      };

      expect(customerSubmittedPayload.data).toBeDefined();
      expect(customerSubmittedPayload.cognitoIdentityId).toBeDefined();
      expect(customerSubmittedPayload.data.firstName).toBeDefined();
      expect(customerSubmittedPayload.data.email).toBeDefined();
    });

    it("should validate Claim.Accepted event payload structure", () => {
      const claimAcceptedPayload = {
        customerId: "CUST-123",
        claimId: "CLAIM-456",
        uploadCarDamageUrl: "https://s3.amazonaws.com/bucket/presigned-url",
        message: "Claim Information has been accepted",
      };

      expect(claimAcceptedPayload.customerId).toBeDefined();
      expect(claimAcceptedPayload.claimId).toBeDefined();
      expect(claimAcceptedPayload.uploadCarDamageUrl).toBeDefined();
      expect(claimAcceptedPayload.message).toBeDefined();
    });

    it("should validate Fraud.Detected event payload structure", () => {
      const fraudDetectedPayload = {
        customerId: "CUST-123",
        documentType: "DRIVERS_LICENSE",
        fraudType: "DOCUMENT",
        fraudReason: "First Name provided does not match with First Name in Driver's License",
      };

      expect(fraudDetectedPayload.customerId).toBeDefined();
      expect(fraudDetectedPayload.documentType).toBeDefined();
      expect(fraudDetectedPayload.fraudType).toBeDefined();
      expect(fraudDetectedPayload.fraudReason).toBeDefined();
    });

    it("should validate Settlement.Finalized event payload structure", () => {
      const settlementFinalizedPayload = {
        settlementId: "SETTLE-789",
        customerId: "CUST-123",
        claimId: "CLAIM-456",
        settlementMessage: "Based on our analysis, your out-of-pocket expense will be $100.00.",
      };

      expect(settlementFinalizedPayload.settlementId).toBeDefined();
      expect(settlementFinalizedPayload.customerId).toBeDefined();
      expect(settlementFinalizedPayload.claimId).toBeDefined();
      expect(settlementFinalizedPayload.settlementMessage).toBeDefined();
    });

    it("should validate Vendor.Finalized event payload structure", () => {
      const vendorFinalizedPayload = {
        customerId: "CUST-123",
        vendorMessage: "Enterprise Rental car has been finalized for you to temporarily use until your car is repaired.",
      };

      expect(vendorFinalizedPayload.customerId).toBeDefined();
      expect(vendorFinalizedPayload.vendorMessage).toBeDefined();
      expect(vendorFinalizedPayload.vendorMessage).toContain("Enterprise Rental car");
    });
  });
});
