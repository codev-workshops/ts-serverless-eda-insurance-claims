// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockDynamoSend = jest.fn();
const mockEbSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({
    send: mockDynamoSend,
  })),
  PutItemCommand: jest.fn((params) => ({ ...params, type: "PutItemCommand" })),
}));

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockEbSend,
  })),
  PutEventsCommand: jest.fn((params) => params),
}));

jest.mock("@aws-sdk/util-dynamodb", () => ({
  marshall: jest.fn((item) => {
    const result: Record<string, any> = {};
    for (const key in item) {
      result[key] = { S: String(item[key]) };
    }
    return result;
  }),
}));

describe("Update Customer Handler", () => {
  let handler: (event: any, context?: any) => Promise<any>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockDynamoSend.mockReset();
    mockEbSend.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      CUSTOMER_TABLE_NAME: "test-customer-table",
      BUS_NAME: "test-bus",
    };
    handler = require("../../../lib/services/customer/app/handlers/update").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should update customer document and publish event", async () => {
    mockDynamoSend.mockResolvedValue({});
    mockEbSend.mockResolvedValue({ FailedEntryCount: 0 });

    const event = {
      detail: {
        customerId: "CUST-123",
        documentType: "DRIVERS_LICENSE",
        analyzedFieldAndValues: {
          FIRST_NAME: "John",
          LAST_NAME: "Doe",
          DOCUMENT_NUMBER: "DL123456",
        },
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(result.body).toBe("Customer Document Updated");
    expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    expect(mockEbSend).toHaveBeenCalledTimes(1);
  });

  it("should store document with correct PK and SK", async () => {
    const { PutItemCommand } = require("@aws-sdk/client-dynamodb");
    const { marshall } = require("@aws-sdk/util-dynamodb");
    mockDynamoSend.mockResolvedValue({});
    mockEbSend.mockResolvedValue({});

    const event = {
      detail: {
        customerId: "CUST-456",
        documentType: "PASSPORT",
        analyzedFieldAndValues: {
          PASSPORT_NUMBER: "P123456789",
        },
      },
    };

    await handler(event);

    expect(marshall).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: "CUST-456",
        SK: "PASSPORT",
        PASSPORT_NUMBER: "P123456789",
      })
    );
  });

  it("should publish Customer.Document.Updated event", async () => {
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
    mockDynamoSend.mockResolvedValue({});
    mockEbSend.mockResolvedValue({});

    const event = {
      detail: {
        customerId: "CUST-789",
        documentType: "DRIVERS_LICENSE",
        analyzedFieldAndValues: {},
      },
    };

    await handler(event);

    expect(PutEventsCommand).toHaveBeenCalledWith({
      Entries: [
        {
          DetailType: "Customer.Document.Updated",
          Source: "customer.service",
          EventBusName: "test-bus",
          Detail: JSON.stringify({
            customerId: "CUST-789",
            documentType: "DRIVERS_LICENSE",
          }),
        },
      ],
    });
  });

  it("should handle DynamoDB errors gracefully", async () => {
    mockDynamoSend.mockRejectedValue(new Error("DynamoDB error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const event = {
      detail: {
        customerId: "CUST-ERROR",
        documentType: "TEST",
        analyzedFieldAndValues: {},
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle EventBridge errors gracefully", async () => {
    mockDynamoSend.mockResolvedValue({});
    mockEbSend.mockRejectedValue(new Error("EventBridge error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const event = {
      detail: {
        customerId: "CUST-EB-ERROR",
        documentType: "TEST",
        analyzedFieldAndValues: {},
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
