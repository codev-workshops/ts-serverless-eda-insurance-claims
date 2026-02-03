// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockDynamoSend = jest.fn();
const mockEbSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({
    send: mockDynamoSend,
  })),
  GetItemCommand: jest.fn((params) => ({ ...params, type: "GetItemCommand" })),
  PutItemCommand: jest.fn((params) => ({ ...params, type: "PutItemCommand" })),
}));

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockEbSend,
  })),
  PutEventsCommand: jest.fn((params) => params),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({})),
  PutObjectCommand: jest.fn((params) => params),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock("@aws-sdk/util-dynamodb", () => ({
  marshall: jest.fn((item) => {
    const result: Record<string, any> = {};
    for (const key in item) {
      result[key] = { S: String(item[key]) };
    }
    return result;
  }),
  unmarshall: jest.fn((item) => {
    const result: Record<string, any> = {};
    for (const key in item) {
      if (item[key].S) result[key] = item[key].S;
      else if (item[key].N) result[key] = Number(item[key].N);
      else if (item[key].BOOL !== undefined) result[key] = item[key].BOOL;
      else result[key] = item[key];
    }
    return result;
  }),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-claim-uuid-12345"),
}));

describe("Claims Processing Handler", () => {
  let handler: (event: any, context?: any) => Promise<any>;
  const originalEnv = process.env;

  const createValidClaimEvent = (overrides = {}) => {
    const baseDetail = {
      "detail-type": "Claim.Requested",
      detail: {
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
        ...overrides,
      },
    };

    return {
      Records: [{ body: JSON.stringify(baseDetail) }],
    };
  };

  beforeEach(() => {
    jest.resetModules();
    mockDynamoSend.mockReset();
    mockEbSend.mockReset();
    mockGetSignedUrl.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      POLICY_TABLE_NAME: "test-policy-table",
      CUSTOMER_TABLE_NAME: "test-customer-table",
      CLAIMS_TABLE_NAME: "test-claims-table",
      BUCKET_NAME: "test-documents-bucket",
      BUS_NAME: "test-bus",
    };
    handler = require("../../../lib/services/claims/app/handlers/claimsProcessing").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should accept valid claim with valid policy dates", async () => {
    const policyStartDate = new Date("2024-01-01");
    const policyEndDate = new Date("2024-12-31");

    mockDynamoSend
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          SK: { S: "Customer|CUST-123" },
          startDate: { S: policyStartDate.toISOString() },
          endDate: { S: policyEndDate.toISOString() },
        },
      })
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "CUST-123" },
          SK: { S: "DRIVERS_LICENSE" },
          DOCUMENT_NUMBER: { S: "DL123456789" },
        },
      })
      .mockResolvedValueOnce({});

    mockEbSend.mockResolvedValue({ FailedEntryCount: 0 });
    mockGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/signed-upload-url");

    const event = createValidClaimEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(result.body).toBe("Claim Accepted");
  });

  it("should reject claim when policy dates are invalid", async () => {
    const policyStartDate = new Date("2023-01-01");
    const policyEndDate = new Date("2023-12-31");

    mockDynamoSend.mockResolvedValueOnce({
      Item: {
        PK: { S: "POLICY-001" },
        SK: { S: "Customer|CUST-123" },
        startDate: { S: policyStartDate.toISOString() },
        endDate: { S: policyEndDate.toISOString() },
      },
    });

    mockEbSend.mockResolvedValue({});

    const event = createValidClaimEvent();
    const result = await handler(event);

    expect(mockEbSend).toHaveBeenCalled();
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
    const callArgs = PutEventsCommand.mock.calls[0][0];
    expect(callArgs.Entries[0].DetailType).toBe("Claim.Rejected");
  });

  it("should reject claim when driver license does not match", async () => {
    const policyStartDate = new Date("2024-01-01");
    const policyEndDate = new Date("2024-12-31");

    mockDynamoSend
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          startDate: { S: policyStartDate.toISOString() },
          endDate: { S: policyEndDate.toISOString() },
        },
      })
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "CUST-123" },
          SK: { S: "DRIVERS_LICENSE" },
          DOCUMENT_NUMBER: { S: "DIFFERENT-DL-NUMBER" },
        },
      });

    mockEbSend.mockResolvedValue({});

    const event = createValidClaimEvent();
    await handler(event);

    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
    const callArgs = PutEventsCommand.mock.calls[0][0];
    expect(callArgs.Entries[0].DetailType).toBe("Claim.Rejected");
    const detail = JSON.parse(callArgs.Entries[0].Detail);
    expect(detail.message).toContain("Driver's License");
  });

  it("should generate presigned URL for damage photo upload", async () => {
    const policyStartDate = new Date("2024-01-01");
    const policyEndDate = new Date("2024-12-31");

    mockDynamoSend
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          startDate: { S: policyStartDate.toISOString() },
          endDate: { S: policyEndDate.toISOString() },
        },
      })
      .mockResolvedValueOnce({
        Item: {
          DOCUMENT_NUMBER: { S: "DL123456789" },
        },
      })
      .mockResolvedValueOnce({});

    mockEbSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-damage-url");

    const event = createValidClaimEvent();
    await handler(event);

    expect(mockGetSignedUrl).toHaveBeenCalled();
  });

  it("should publish Claim.Accepted event with claimId and uploadUrl", async () => {
    const policyStartDate = new Date("2024-01-01");
    const policyEndDate = new Date("2024-12-31");

    mockDynamoSend
      .mockResolvedValueOnce({
        Item: {
          PK: { S: "POLICY-001" },
          startDate: { S: policyStartDate.toISOString() },
          endDate: { S: policyEndDate.toISOString() },
        },
      })
      .mockResolvedValueOnce({
        Item: {
          DOCUMENT_NUMBER: { S: "DL123456789" },
        },
      })
      .mockResolvedValueOnce({});

    mockEbSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue("https://upload-url.com");

    const event = createValidClaimEvent();
    await handler(event);

    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
    const callArgs = PutEventsCommand.mock.calls[0][0];
    expect(callArgs.Entries[0].DetailType).toBe("Claim.Accepted");
    const detail = JSON.parse(callArgs.Entries[0].Detail);
    expect(detail.claimId).toBe("test-claim-uuid-12345");
    expect(detail.uploadCarDamageUrl).toBe("https://upload-url.com");
  });

  it("should ignore events with unsupported detail type", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({
            "detail-type": "Unsupported.Event.Type",
            detail: {},
          }),
        },
      ],
    };

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    await handler(event);

    expect(mockDynamoSend).not.toHaveBeenCalled();
    expect(mockEbSend).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle DynamoDB errors gracefully", async () => {
    mockDynamoSend.mockRejectedValue(new Error("DynamoDB error"));
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    const event = createValidClaimEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
