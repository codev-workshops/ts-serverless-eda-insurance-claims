// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockSend,
  })),
  PutEventsCommand: jest.fn((params) => params),
}));

describe("Signup Handler", () => {
  let handler: (event: any) => Promise<any>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      BUS_NAME: "test-bus",
    };
    handler = require("../../../lib/services/customer/app/handlers/signup").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully submit customer and return 200", async () => {
    mockSend.mockResolvedValue({ FailedEntryCount: 0 });

    const event = {
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      }),
      requestContext: {
        identity: {
          cognitoIdentityId: "us-east-1:12345678-1234-1234-1234-123456789012",
        },
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: "Customer Submitted" });
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should send event with correct detail type and source", async () => {
    mockSend.mockResolvedValue({ FailedEntryCount: 0 });
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

    const event = {
      body: JSON.stringify({
        firstName: "Jane",
        lastName: "Smith",
      }),
      requestContext: {
        identity: {
          cognitoIdentityId: "us-east-1:test-identity",
        },
      },
    };

    await handler(event);

    expect(PutEventsCommand).toHaveBeenCalledWith({
      Entries: [
        {
          DetailType: "Customer.Submitted",
          Source: "signup.service",
          EventBusName: "test-bus",
          Detail: expect.any(String),
        },
      ],
    });

    const callArgs = PutEventsCommand.mock.calls[0][0];
    const detail = JSON.parse(callArgs.Entries[0].Detail);
    expect(detail.cognitoIdentityId).toBe("us-east-1:test-identity");
    expect(detail.data.firstName).toBe("Jane");
  });

  it("should handle EventBridge errors gracefully", async () => {
    mockSend.mockRejectedValue(new Error("EventBridge error"));

    const event = {
      body: JSON.stringify({ firstName: "Test" }),
      requestContext: {
        identity: {
          cognitoIdentityId: "test-id",
        },
      },
    };

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should include cognitoIdentityId in the message", async () => {
    mockSend.mockResolvedValue({ FailedEntryCount: 0 });
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

    const cognitoId = "us-east-1:unique-cognito-id";
    const event = {
      body: JSON.stringify({ test: "data" }),
      requestContext: {
        identity: {
          cognitoIdentityId: cognitoId,
        },
      },
    };

    await handler(event);

    const callArgs = PutEventsCommand.mock.calls[0][0];
    const detail = JSON.parse(callArgs.Entries[0].Detail);
    expect(detail.cognitoIdentityId).toBe(cognitoId);
  });
});
