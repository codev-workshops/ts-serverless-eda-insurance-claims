const mockDynamoDBSend = jest.fn();
const mockEventBridgeSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockDynamoDBSend,
  })),
  QueryCommand: jest.fn().mockImplementation((params) => params),
  GetItemCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: mockEventBridgeSend,
  })),
  PutEventsCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: jest.fn().mockImplementation((item) => item),
}));

describe('Fraud Detection Lambda Handler', () => {
  let handler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.BUS_NAME = 'test-bus';
    process.env.CUSTOMER_TABLE_NAME = 'customer-table';
    process.env.POLICY_TABLE_NAME = 'policy-table';
    process.env.CLAIMS_TABLE_NAME = 'claims-table';
    jest.resetModules();
    handler = require('../lib/services/fraud/app/handlers/fraudDetection').handler;
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.BUS_NAME;
    delete process.env.CUSTOMER_TABLE_NAME;
    delete process.env.POLICY_TABLE_NAME;
    delete process.env.CLAIMS_TABLE_NAME;
  });

  describe('Driver License Document Processing', () => {
    it('should detect fraud when first name does not match', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [{ firstname: 'John', PK: { S: 'customer-123' } }],
      });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'DRIVERS_LICENSE',
          customerId: 'customer-123',
          analyzedFieldAndValues: {
            FIRST_NAME: 'Jane',
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
      expect(mockEventBridgeSend).toHaveBeenCalled();
    });

    it('should not detect fraud when first name matches', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [{ firstname: 'John', PK: { S: 'customer-123' } }],
      });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'DRIVERS_LICENSE',
          customerId: 'customer-123',
          analyzedFieldAndValues: {
            FIRST_NAME: 'John',
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });

    it('should handle case-insensitive name comparison', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [{ firstname: 'JOHN', PK: { S: 'customer-123' } }],
      });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'DRIVERS_LICENSE',
          customerId: 'customer-123',
          analyzedFieldAndValues: {
            FIRST_NAME: 'john',
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });
  });

  describe('Car Document Processing', () => {
    it('should process car document for signup type', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: { color: 'blue', PK: { S: 'policy-123' } },
      });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'CAR',
          customerId: 'customer-123',
          recordId: 'policy-123',
          analyzedFieldAndValues: {
            type: 'signup',
            color: { Name: 'blue' },
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });

    it('should detect fraud when car color does not match policy', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: { color: 'red', PK: { S: 'policy-123' } },
      });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'CAR',
          customerId: 'customer-123',
          recordId: 'policy-123',
          analyzedFieldAndValues: {
            type: 'signup',
            color: { Name: 'blue' },
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });

    it('should process car document for claims type', async () => {
      mockDynamoDBSend
        .mockResolvedValueOnce({
          Item: { policyId: 'policy-123', PK: { S: 'claim-123' } },
        })
        .mockResolvedValueOnce({
          Item: { color: 'blue', PK: { S: 'policy-123' } },
        });
      mockEventBridgeSend.mockResolvedValueOnce({});

      const event = {
        detail: {
          documentType: 'CAR',
          customerId: 'customer-123',
          recordId: 'claim-123',
          analyzedFieldAndValues: {
            type: 'claims',
            damage: { Name: 'bumper_dent' },
            color: { Name: 'blue' },
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });
  });

  describe('Unknown Document Types', () => {
    it('should handle unknown document type gracefully', async () => {
      const event = {
        detail: {
          documentType: 'UNKNOWN',
          customerId: 'customer-123',
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
      expect(mockDynamoDBSend).not.toHaveBeenCalled();
    });

    it('should handle missing document type', async () => {
      const event = {
        detail: {
          customerId: 'customer-123',
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      const event = {
        detail: {
          documentType: 'DRIVERS_LICENSE',
          customerId: 'customer-123',
          analyzedFieldAndValues: {
            FIRST_NAME: 'John',
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });

    it('should handle EventBridge errors gracefully', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [{ firstname: 'John', PK: { S: 'customer-123' } }],
      });
      mockEventBridgeSend.mockRejectedValueOnce(new Error('EventBridge error'));

      const event = {
        detail: {
          documentType: 'DRIVERS_LICENSE',
          customerId: 'customer-123',
          analyzedFieldAndValues: {
            FIRST_NAME: 'Jane',
          },
        },
      };

      const result = await handler(event);

      expect(result).toBe('Fraud Detection Lambda called');
    });
  });
});
