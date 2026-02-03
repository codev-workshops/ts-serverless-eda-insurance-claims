// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockDynamoSend = jest.fn();
const mockEbSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({
    send: mockDynamoSend,
  })),
  QueryCommand: jest.fn((params) => ({ ...params, type: "QueryCommand" })),
  GetItemCommand: jest.fn((params) => ({ ...params, type: "GetItemCommand" })),
}));

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockEbSend,
  })),
  PutEventsCommand: jest.fn((params) => params),
}));

jest.mock("@aws-sdk/util-dynamodb", () => ({
  unmarshall: jest.fn((item) => {
    const result: Record<string, any> = {};
    for (const key in item) {
      if (item[key].S) result[key] = item[key].S;
      else if (item[key].N) result[key] = Number(item[key].N);
      else result[key] = item[key];
    }
    return result;
  }),
}));

describe("Fraud Detection Handler", () => {
  let handler: (event: any) => Promise<string>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockDynamoSend.mockReset();
    mockEbSend.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      CUSTOMER_TABLE_NAME: "test-customer-table",
      POLICY_TABLE_NAME: "test-policy-table",
      CLAIMS_TABLE_NAME: "test-claims-table",
      BUS_NAME: "test-bus",
    };
    handler = require("../../../lib/services/fraud/app/handlers/fraudDetection").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Identity Fraud Detection (DRIVERS_LICENSE)", () => {
    it("should detect fraud when first name does not match", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            PK: { S: "CUST-123" },
            firstname: { S: "John" },
            lastname: { S: "Doe" },
          },
        ],
      });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: {
            FIRST_NAME: "Jane",
            LAST_NAME: "Doe",
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Detected");
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.fraudType).toBe("DOCUMENT");
      expect(detail.fraudReason).toContain("First Name");
    });

    it("should not detect fraud when first name matches (case insensitive)", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            PK: { S: "CUST-123" },
            firstname: { S: "JOHN" },
            lastname: { S: "Doe" },
          },
        ],
      });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: {
            FIRST_NAME: "john",
            LAST_NAME: "Doe",
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });

    it("should publish event with correct source and bus name", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [{ PK: { S: "CUST-123" }, firstname: { S: "John" } }],
      });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: { FIRST_NAME: "John" },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].Source).toBe("fraud.service");
      expect(callArgs.Entries[0].EventBusName).toBe("test-bus");
    });
  });

  describe("Insured Asset Fraud Detection (CAR - Signup)", () => {
    it("should detect fraud when car color does not match policy", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          SK: { S: "Customer|CUST-123" },
          color: { S: "blue" },
        },
      });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          recordId: "POLICY-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "signup",
            color: { Name: "red", Confidence: 99.5 },
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Detected");
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.fraudType).toBe("SIGNUP.CAR");
      expect(detail.fraudReason).toContain("Color");
    });

    it("should not detect fraud when car color matches policy", async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          color: { S: "blue" },
        },
      });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          recordId: "POLICY-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "signup",
            color: { Name: "Blue", Confidence: 98.0 },
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });
  });

  describe("Insured Asset Fraud Detection (CAR - Claims)", () => {
    it("should detect fraud when no damage detected in claims", async () => {
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          recordId: "CLAIM-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "claims",
            damage: { Name: "unknown", Confidence: 50 },
            color: { Name: "blue", Confidence: 99 },
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Detected");
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.fraudType).toBe("CLAIMS");
      expect(detail.fraudReason).toContain("No damage detected");
    });

    it("should check color match when damage is detected in claims", async () => {
      mockDynamoSend
        .mockResolvedValueOnce({
          Item: {
            PK: { S: "CLAIM-001" },
            policyId: { S: "POLICY-001" },
          },
        })
        .mockResolvedValueOnce({
          Item: {
            PK: { S: "POLICY-001" },
            color: { S: "green" },
          },
        });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          recordId: "CLAIM-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "claims",
            damage: { Name: "bumper_dent", Confidence: 95 },
            color: { Name: "green", Confidence: 99 },
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });

    it("should detect fraud when damage detected but color mismatch", async () => {
      mockDynamoSend
        .mockResolvedValueOnce({
          Item: {
            PK: { S: "CLAIM-001" },
            policyId: { S: "POLICY-001" },
          },
        })
        .mockResolvedValueOnce({
          Item: {
            PK: { S: "POLICY-001" },
            color: { S: "white" },
          },
        });
      mockEbSend.mockResolvedValue({});

      const event = {
        detail: {
          customerId: "CUST-123",
          recordId: "CLAIM-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "claims",
            damage: { Name: "scratch", Confidence: 90 },
            color: { Name: "black", Confidence: 99 },
          },
        },
      };

      await handler(event);

      const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
      const callArgs = PutEventsCommand.mock.calls[0][0];
      expect(callArgs.Entries[0].DetailType).toBe("Fraud.Detected");
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.fraudReason).toContain("Color");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown document type gracefully", async () => {
      const event = {
        detail: {
          customerId: "CUST-123",
          documentType: "UNKNOWN_TYPE",
          analyzedFieldAndValues: {},
        },
      };

      const result = await handler(event);

      expect(result).toBe("Fraud Detection Lambda called");
      expect(mockEbSend).not.toHaveBeenCalled();
    });

    it("should handle DynamoDB errors gracefully", async () => {
      mockDynamoSend.mockRejectedValue(new Error("DynamoDB error"));
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const event = {
        detail: {
          customerId: "CUST-ERROR",
          documentType: "DRIVERS_LICENSE",
          analyzedFieldAndValues: { FIRST_NAME: "Test" },
        },
      };

      const result = await handler(event);

      expect(result).toBe("Fraud Detection Lambda called");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
