const mockEbSend = jest.fn().mockResolvedValue({});
const mockDdbSend = jest.fn();

jest.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: mockEbSend,
  })),
  PutEventsCommand: jest.fn().mockImplementation((input) => input),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockDdbSend,
  })),
  QueryCommand: jest.fn().mockImplementation((input) => input),
  GetItemCommand: jest.fn().mockImplementation((input) => input),
}));

jest.mock("@aws-sdk/util-dynamodb", () => ({
  unmarshall: jest.fn((item) => item),
}));

const { PutEventsCommand } = require("@aws-sdk/client-eventbridge");

describe("Fraud Detection Handler", () => {
  let handler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = "us-east-1";
    process.env.BUS_NAME = "test-bus";
    process.env.CUSTOMER_TABLE_NAME = "CustomerTable";
    process.env.POLICY_TABLE_NAME = "PolicyTable";
    process.env.CLAIMS_TABLE_NAME = "ClaimsTable";
    jest.resetModules();

    jest.mock("@aws-sdk/client-eventbridge", () => ({
      EventBridgeClient: jest.fn().mockImplementation(() => ({
        send: mockEbSend,
      })),
      PutEventsCommand: jest.fn().mockImplementation((input) => input),
    }));

    jest.mock("@aws-sdk/client-dynamodb", () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({
        send: mockDdbSend,
      })),
      QueryCommand: jest.fn().mockImplementation((input) => input),
      GetItemCommand: jest.fn().mockImplementation((input) => input),
    }));

    jest.mock("@aws-sdk/util-dynamodb", () => ({
      unmarshall: jest.fn((item) => item),
    }));

    handler =
      require("../../lib/services/fraud/app/handlers/fraudDetection").handler;
  });

  describe("Driver's License Fraud Detection", () => {
    it("should detect fraud when first name does not match", async () => {
      mockDdbSend.mockResolvedValueOnce({
        Items: [{ firstname: "John", PK: "cust-123" }],
      });

      const event = {
        detail: {
          documentType: "DRIVERS_LICENSE",
          customerId: "cust-123",
          analyzedFieldAndValues: {
            FIRST_NAME: "Jane",
          },
        },
      };

      await handler(event);

      const putEventsCall =
        require("@aws-sdk/client-eventbridge").PutEventsCommand.mock
          .calls[0][0];
      expect(putEventsCall.Entries[0].DetailType).toBe("Fraud.Detected");
      expect(putEventsCall.Entries[0].Source).toBe("fraud.service");
    });

    it("should not detect fraud when first name matches", async () => {
      mockDdbSend.mockResolvedValueOnce({
        Items: [{ firstname: "John", PK: "cust-123" }],
      });

      const event = {
        detail: {
          documentType: "DRIVERS_LICENSE",
          customerId: "cust-123",
          analyzedFieldAndValues: {
            FIRST_NAME: "John",
          },
        },
      };

      await handler(event);

      const putEventsCall =
        require("@aws-sdk/client-eventbridge").PutEventsCommand.mock
          .calls[0][0];
      expect(putEventsCall.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });

    it("should not detect fraud when first name matches case-insensitively", async () => {
      mockDdbSend.mockResolvedValueOnce({
        Items: [{ firstname: "john", PK: "cust-123" }],
      });

      const event = {
        detail: {
          documentType: "DRIVERS_LICENSE",
          customerId: "cust-123",
          analyzedFieldAndValues: {
            FIRST_NAME: "JOHN",
          },
        },
      };

      await handler(event);

      const putEventsCall =
        require("@aws-sdk/client-eventbridge").PutEventsCommand.mock
          .calls[0][0];
      expect(putEventsCall.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });
  });

  describe("Car Image Fraud Detection", () => {
    it("should detect fraud when car color does not match policy for signup", async () => {
      mockDdbSend.mockResolvedValueOnce({
        Item: { PK: "pol-123", color: "green" },
      });

      const event = {
        detail: {
          documentType: "CAR",
          customerId: "cust-123",
          recordId: "pol-123",
          analyzedFieldAndValues: {
            type: "signup",
            color: { Name: "red", Confidence: 95 },
          },
        },
      };

      await handler(event);

      const putEventsCall =
        require("@aws-sdk/client-eventbridge").PutEventsCommand.mock
          .calls[0][0];
      expect(putEventsCall.Entries[0].DetailType).toBe("Fraud.Detected");
    });

    it("should not detect fraud when car color matches policy for signup", async () => {
      mockDdbSend.mockResolvedValueOnce({
        Item: { PK: "pol-123", color: "green" },
      });

      const event = {
        detail: {
          documentType: "CAR",
          customerId: "cust-123",
          recordId: "pol-123",
          analyzedFieldAndValues: {
            type: "signup",
            color: { Name: "green", Confidence: 95 },
          },
        },
      };

      await handler(event);

      const putEventsCall =
        require("@aws-sdk/client-eventbridge").PutEventsCommand.mock
          .calls[0][0];
      expect(putEventsCall.Entries[0].DetailType).toBe("Fraud.Not.Detected");
    });
  });

  describe("Unsupported Document Type", () => {
    it("should return without publishing events for unknown document type", async () => {
      const event = {
        detail: {
          documentType: "UNKNOWN",
          customerId: "cust-123",
        },
      };

      const result = await handler(event);
      expect(result).toBe("Fraud Detection Lambda called");
      expect(mockEbSend).not.toHaveBeenCalled();
    });
  });
});
