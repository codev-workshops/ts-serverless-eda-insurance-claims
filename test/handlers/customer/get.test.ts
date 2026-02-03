// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({
    send: mockSend,
  })),
  ScanCommand: jest.fn((params) => ({ ...params, type: "ScanCommand" })),
  QueryCommand: jest.fn((params) => ({ ...params, type: "QueryCommand" })),
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

describe("Get Customer Handler", () => {
  let handler: (event: any, context?: any) => Promise<any>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      CUSTOMER_TABLE_NAME: "test-customer-table",
      POLICY_TABLE_NAME: "test-policy-table",
    };
    handler = require("../../../lib/services/customer/app/handlers/get").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return empty object when no customer found", async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const event = {
      requestContext: {
        identity: {
          cognitoIdentityId: "us-east-1:unknown-id",
        },
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({});
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("should return customer details when customer exists", async () => {
    const customerId = "CUST-123";
    const cognitoId = "us-east-1:test-cognito-id";

    mockSend
      .mockResolvedValueOnce({
        Items: [
          {
            PK: { S: customerId },
            SK: { S: "COGNITO_IDENTITY_ID" },
            cognitoIdentityId: { S: cognitoId },
          },
        ],
      })
      .mockResolvedValueOnce({
        Items: [
          {
            PK: { S: customerId },
            SK: { S: "COGNITO_IDENTITY_ID" },
            cognitoIdentityId: { S: cognitoId },
          },
          {
            PK: { S: customerId },
            SK: { S: "CUSTOMER_DETAILS" },
            firstname: { S: "John" },
            lastname: { S: "Doe" },
            email: { S: "john.doe@example.com" },
          },
        ],
      })
      .mockResolvedValueOnce({
        Items: [
          {
            PK: { S: "POLICY-001" },
            SK: { S: `Customer|${customerId}` },
            policyType: { S: "AUTO" },
          },
        ],
      });

    const event = {
      requestContext: {
        identity: {
          cognitoIdentityId: cognitoId,
        },
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.PK).toBe(customerId);
    expect(body.firstname).toBe("John");
    expect(body.lastname).toBe("Doe");
    expect(body.policies).toBeDefined();
  });

  it("should query customer table with correct parameters", async () => {
    const { ScanCommand } = require("@aws-sdk/client-dynamodb");
    mockSend.mockResolvedValueOnce({ Items: [] });

    const cognitoId = "us-east-1:specific-id";
    const event = {
      requestContext: {
        identity: {
          cognitoIdentityId: cognitoId,
        },
      },
    };

    await handler(event);

    expect(ScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: "test-customer-table",
        FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
        ExpressionAttributeValues: {
          ":sk": { S: "COGNITO_IDENTITY_ID" },
          ":identifier": { S: cognitoId },
        },
      })
    );
  });

  it("should handle multiple customer records correctly", async () => {
    const customerId = "CUST-456";

    mockSend
      .mockResolvedValueOnce({
        Items: [
          {
            PK: { S: customerId },
            SK: { S: "COGNITO_IDENTITY_ID" },
          },
        ],
      })
      .mockResolvedValueOnce({
        Items: [
          {
            PK: { S: customerId },
            SK: { S: "COGNITO_IDENTITY_ID" },
          },
          {
            PK: { S: customerId },
            SK: { S: "PROFILE" },
            firstname: { S: "Jane" },
            lastname: { S: "Smith" },
          },
        ],
      })
      .mockResolvedValueOnce({
        Items: [],
      });

    const event = {
      requestContext: {
        identity: {
          cognitoIdentityId: "test-id",
        },
      },
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(body.firstname).toBe("Jane");
    expect(body.lastname).toBe("Smith");
    expect(body.policies).toEqual([]);
  });
});
