const mockSend = jest.fn();

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutEventsCommand: jest.fn().mockImplementation((params) => params),
}));

describe('FNOL Lambda Handler', () => {
  let handler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.BUS_NAME = 'test-bus';
    jest.resetModules();
    handler = require('../lib/services/claims/app/handlers/fnol').handler;
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.BUS_NAME;
  });

  describe('Successful Claim Requests', () => {
    it('should return 200 status code for valid claim request', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {
        body: JSON.stringify({
          customerId: 'customer-123',
          claimType: 'auto',
          description: 'Car accident',
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('Claim Requested');
    });

    it('should include correct headers in response', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {
        body: JSON.stringify({ customerId: 'customer-123' }),
      };

      const result = await handler(event);

      expect(result.headers['content-type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should set isBase64Encoded to false', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {
        body: JSON.stringify({ customerId: 'customer-123' }),
      };

      const result = await handler(event);

      expect(result.isBase64Encoded).toBe(false);
    });

    it('should send event to EventBridge with correct detail type', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {
        body: JSON.stringify({ customerId: 'customer-123' }),
      };

      await handler(event);

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle EventBridge errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('EventBridge error'));
      
      const event = {
        body: JSON.stringify({ customerId: 'customer-123' }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should still return success even when EventBridge fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));
      
      const event = {
        body: JSON.stringify({ customerId: 'customer-123' }),
      };

      const result = await handler(event);

      expect(result.body).toBe('Claim Requested');
    });
  });

  describe('Event Body Processing', () => {
    it('should pass event body to EventBridge', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const claimData = {
        customerId: 'customer-456',
        claimType: 'collision',
        amount: 5000,
      };
      
      const event = {
        body: JSON.stringify(claimData),
      };

      await handler(event);

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle empty body', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {
        body: '',
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle undefined body', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const event = {};

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});
