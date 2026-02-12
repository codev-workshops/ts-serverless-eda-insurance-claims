const mockSignupSend = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: mockSignupSend,
  })),
  PutEventsCommand: jest.fn().mockImplementation((input) => input),
}));

const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");
const signupModule = require("../../lib/services/customer/app/handlers/signup");

describe("Signup Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = "us-east-1";
    process.env.BUS_NAME = "test-bus";
  });

  it("should publish Customer.Submitted event with correct data", async () => {
    const customerData = {
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
    };

    const event = {
      body: JSON.stringify(customerData),
      requestContext: {
        identity: {
          cognitoIdentityId: "us-east-1:abc-123",
        },
      },
    };

    const result = await signupModule.handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe("Customer Submitted");
    expect(mockSignupSend).toHaveBeenCalledTimes(1);
    expect(PutEventsCommand).toHaveBeenCalledWith({
      Entries: [
        {
          DetailType: "Customer.Submitted",
          Source: "signup.service",
          EventBusName: "test-bus",
          Detail: JSON.stringify({
            data: customerData,
            cognitoIdentityId: "us-east-1:abc-123",
          }),
        },
      ],
    });
  });

  it("should include CORS headers in response", async () => {
    const event = {
      body: JSON.stringify({ name: "test" }),
      requestContext: {
        identity: { cognitoIdentityId: "test-id" },
      },
    };

    const result = await signupModule.handler(event);

    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(result.isBase64Encoded).toBe(false);
  });

  it("should return 200 even when EventBridge fails", async () => {
    mockSignupSend.mockRejectedValueOnce(new Error("EventBridge error"));

    const event = {
      body: JSON.stringify({ name: "test" }),
      requestContext: {
        identity: { cognitoIdentityId: "test-id" },
      },
    };

    const result = await signupModule.handler(event);
    expect(result.statusCode).toBe(200);
  });

  it("should extract cognitoIdentityId from request context", async () => {
    const cognitoId = "us-east-1:unique-cognito-id";
    const event = {
      body: JSON.stringify({ firstname: "Jane" }),
      requestContext: {
        identity: { cognitoIdentityId: cognitoId },
      },
    };

    await signupModule.handler(event);

    const putEventsCall = PutEventsCommand.mock.calls[0][0];
    const detail = JSON.parse(putEventsCall.Entries[0].Detail);
    expect(detail.cognitoIdentityId).toBe(cognitoId);
  });
});
