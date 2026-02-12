const mockFnolSend = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: mockFnolSend,
  })),
  PutEventsCommand: jest.fn().mockImplementation((input) => input),
}));

const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
const fnolModule = require("../../lib/services/claims/app/handlers/fnol");

describe("FNOL Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = "us-east-1";
    process.env.BUS_NAME = "test-bus";
  });

  it("should publish Claim.Requested event to EventBridge", async () => {
    const claimBody = JSON.stringify({
      customerId: "cust-123",
      policyId: "pol-456",
      description: "Rear-end collision",
    });

    const event = { body: claimBody };
    const result = await fnolModule.handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Claim Requested");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(mockFnolSend).toHaveBeenCalledTimes(1);
    expect(PutEventsCommand).toHaveBeenCalledWith({
      Entries: [
        {
          DetailType: "Claim.Requested",
          Source: "fnol.service",
          EventBusName: "test-bus",
          Detail: claimBody,
        },
      ],
    });
  });

  it("should return 200 even when EventBridge fails", async () => {
    mockFnolSend.mockRejectedValueOnce(new Error("EventBridge error"));

    const event = { body: JSON.stringify({ customerId: "cust-123" }) };
    const result = await fnolModule.handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Claim Requested");
  });

  it("should include CORS headers in response", async () => {
    const event = { body: JSON.stringify({}) };
    const result = await fnolModule.handler(event);

    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(result.isBase64Encoded).toBe(false);
  });
});
