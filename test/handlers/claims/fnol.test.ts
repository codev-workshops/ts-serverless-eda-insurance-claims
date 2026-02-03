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

describe("FNOL Handler", () => {
  let handler: (event: any) => Promise<any>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      BUS_NAME: "test-claims-bus",
    };
    handler = require("../../../lib/services/claims/app/handlers/fnol").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully submit claim and return 200", async () => {
    mockSend.mockResolvedValue({ FailedEntryCount: 0 });

    const claimData = {
      incident: {
        occurrenceDateTime: "2024-01-15T10:30:00Z",
        location: { city: "Seattle", state: "WA" },
        description: "Rear-end collision at intersection",
      },
      policy: { id: "POLICY-001" },
      personalInformation: {
        customerId: "CUST-123",
        driversLicenseNumber: "DL123456",
      },
    };

    const event = {
      body: JSON.stringify(claimData),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Claim Requested");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should send event with Claim.Requested detail type", async () => {
    mockSend.mockResolvedValue({ FailedEntryCount: 0 });
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

    const claimBody = JSON.stringify({
      incident: { description: "Test incident" },
      policy: { id: "POL-001" },
    });

    const event = { body: claimBody };

    await handler(event);

    expect(PutEventsCommand).toHaveBeenCalledWith({
      Entries: [
        {
          DetailType: "Claim.Requested",
          Source: "fnol.service",
          EventBusName: "test-claims-bus",
          Detail: claimBody,
        },
      ],
    });
  });

  it("should use correct event bus name from environment", async () => {
    mockSend.mockResolvedValue({});

    const event = { body: JSON.stringify({ test: "data" }) };
    await handler(event);

    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
    expect(PutEventsCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Entries: expect.arrayContaining([
          expect.objectContaining({
            EventBusName: "test-claims-bus",
          }),
        ]),
      })
    );
  });

  it("should handle EventBridge errors gracefully", async () => {
    mockSend.mockRejectedValue(new Error("EventBridge service error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const event = {
      body: JSON.stringify({ incident: { description: "Test" } }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should pass body directly as Detail without modification", async () => {
    mockSend.mockResolvedValue({});
    const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

    const originalBody = JSON.stringify({
      incident: {
        occurrenceDateTime: "2024-02-01T08:00:00Z",
        fnolDateTime: "2024-02-01T09:00:00Z",
        location: {
          country: "USA",
          state: "CA",
          city: "Los Angeles",
          zip: "90001",
          road: "Main Street",
        },
        description: "Side impact collision",
      },
      policy: { id: "POL-12345" },
      personalInformation: {
        customerId: "CUST-789",
        driversLicenseNumber: "CA123456",
        isInsurerDriver: true,
        licensePlateNumber: "ABC1234",
        numberOfPassengers: 2,
      },
      policeReport: {
        isFiled: true,
        reportOrReceiptAvailable: true,
      },
      otherParty: {
        insuranceId: "INS-OTHER-001",
        insuranceCompany: "Other Insurance Co",
        firstName: "Jane",
        lastName: "Smith",
      },
    });

    const event = { body: originalBody };
    await handler(event);

    const callArgs = PutEventsCommand.mock.calls[0][0];
    expect(callArgs.Entries[0].Detail).toBe(originalBody);
  });
});
