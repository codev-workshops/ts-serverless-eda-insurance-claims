// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const mockSend = jest.fn();
const mockConsumerCreate = jest.fn();
const mockStart = jest.fn();
const mockOn = jest.fn();

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockSend,
  })),
  PutEventsCommand: jest.fn((params) => params),
}));

jest.mock('sqs-consumer', () => ({
  Consumer: {
    create: mockConsumerCreate,
  },
}));

describe('Vendor Service', () => {
  const originalEnv = process.env;
  let handleMessageCallback;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockConsumerCreate.mockReset();
    mockStart.mockReset();
    mockOn.mockReset();

    mockConsumerCreate.mockImplementation((config) => {
      handleMessageCallback = config.handleMessage;
      return {
        on: mockOn.mockReturnThis(),
        start: mockStart,
      };
    });

    process.env = {
      ...originalEnv,
      AWS_REGION: 'us-east-1',
      VENDOR_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/vendor-queue',
      VENDOR_EVENT_SOURCE: 'vendor.service',
      VENDOR_EVENT_TYPE: 'Vendor.Finalized',
      BUS_NAME: 'test-bus',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Consumer Configuration', () => {
    it('should create consumer with correct queue URL', () => {
      require('./index');

      expect(mockConsumerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/vendor-queue',
        })
      );
    });

    it('should register error handlers', () => {
      require('./index');

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('processing_error', expect.any(Function));
    });

    it('should start the consumer', () => {
      require('./index');

      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      require('./index');
    });

    it('should process settlement finalized message and publish vendor event', async () => {
      mockSend.mockResolvedValue({ FailedEntryCount: 0 });

      const message = {
        Body: JSON.stringify({
          'detail-type': 'Settlement.Finalized',
          source: 'settlement.service',
          detail: {
            claimId: 'CLAIM-123',
            customerId: 'CUST-456',
            settlementMessage: 'Settlement complete',
          },
        }),
      };

      await handleMessageCallback(message);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should publish event with correct detail type', async () => {
      const { PutEventsCommand } = require('@aws-sdk/client-eventbridge');
      mockSend.mockResolvedValue({});

      const message = {
        Body: JSON.stringify({
          detail: {
            claimId: 'CLAIM-789',
            customerId: 'CUST-012',
          },
        }),
      };

      await handleMessageCallback(message);

      expect(PutEventsCommand).toHaveBeenCalledWith({
        Entries: [
          expect.objectContaining({
            DetailType: 'Vendor.Finalized',
            Source: 'vendor.service',
            EventBusName: 'test-bus',
          }),
        ],
      });
    });

    it('should include customerId in event detail', async () => {
      const { PutEventsCommand } = require('@aws-sdk/client-eventbridge');
      mockSend.mockResolvedValue({});

      const message = {
        Body: JSON.stringify({
          detail: {
            claimId: 'CLAIM-ABC',
            customerId: 'CUSTOMER-XYZ',
          },
        }),
      };

      await handleMessageCallback(message);

      const callArgs = PutEventsCommand.mock.calls[0][0];
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.customerId).toBe('CUSTOMER-XYZ');
    });

    it('should include vendor message with claim id', async () => {
      const { PutEventsCommand } = require('@aws-sdk/client-eventbridge');
      mockSend.mockResolvedValue({});

      const claimId = 'CLAIM-UNIQUE-123';
      const message = {
        Body: JSON.stringify({
          detail: {
            claimId: claimId,
            customerId: 'CUST-001',
          },
        }),
      };

      await handleMessageCallback(message);

      const callArgs = PutEventsCommand.mock.calls[0][0];
      const detail = JSON.parse(callArgs.Entries[0].Detail);
      expect(detail.vendorMessage).toContain(claimId);
      expect(detail.vendorMessage).toContain('Enterprise Rental car');
    });

    it('should handle EventBridge errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('EventBridge error'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const message = {
        Body: JSON.stringify({
          detail: {
            claimId: 'CLAIM-ERROR',
            customerId: 'CUST-ERROR',
          },
        }),
      };

      await handleMessageCallback(message);

      expect(consoleSpy).toHaveBeenCalledWith('Error', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should log success when event is published', async () => {
      mockSend.mockResolvedValue({
        Entries: [{ EventId: 'event-123' }],
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const message = {
        Body: JSON.stringify({
          detail: {
            claimId: 'CLAIM-SUCCESS',
            customerId: 'CUST-SUCCESS',
          },
        }),
      };

      await handleMessageCallback(message);

      expect(consoleSpy).toHaveBeenCalledWith('Success', expect.anything());
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handlers', () => {
    it('should log errors from error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      require('./index');

      const errorHandler = mockOn.mock.calls.find((call) => call[0] === 'error')[1];
      const testError = new Error('Test error');
      errorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith('Test error');
      consoleSpy.mockRestore();
    });

    it('should log errors from processing_error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      require('./index');

      const processingErrorHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'processing_error'
      )[1];
      const testError = new Error('Processing error');
      processingErrorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith('Processing error');
      consoleSpy.mockRestore();
    });
  });
});
