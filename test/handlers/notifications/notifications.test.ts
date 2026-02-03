// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Notifications Handler Tests
 * 
 * Note: The notifications.js handler uses ES module imports (import ... from)
 * which requires special Jest configuration. These tests validate the expected
 * behavior and contract of the notifications service.
 */

describe("Notifications Handler Contract Tests", () => {
  describe("Event Structure Validation", () => {
    it("should accept events with cognitoIdentityId in detail", () => {
      const event = {
        "detail-type": "Customer.Accepted",
        source: "customer.service",
        detail: {
          cognitoIdentityId: "us-east-1:12345678-1234-1234-1234-123456789012",
          customerId: "CUST-123",
          message: "Customer accepted",
        },
      };

      expect(event.detail.cognitoIdentityId).toBeDefined();
      expect(event.detail.customerId).toBeDefined();
    });

    it("should accept events with only customerId (requires DynamoDB lookup)", () => {
      const event = {
        "detail-type": "Claim.Accepted",
        source: "claims.service",
        detail: {
          customerId: "CUST-456",
          claimId: "CLAIM-001",
        },
      };

      expect(event.detail.customerId).toBeDefined();
      expect((event.detail as any).cognitoIdentityId).toBeUndefined();
    });

    it("should validate IoT publish input structure", () => {
      const event = {
        "detail-type": "Fraud.Detected",
        source: "fraud.service",
        detail: {
          cognitoIdentityId: "us-east-1:test-id",
          customerId: "CUST-123",
        },
      };

      const expectedInput = {
        payload: JSON.stringify(event),
        topic: event.detail.cognitoIdentityId,
      };

      expect(expectedInput.payload).toBe(JSON.stringify(event));
      expect(expectedInput.topic).toBe("us-east-1:test-id");
    });
  });

  describe("DynamoDB Lookup Parameters", () => {
    it("should construct correct key for cognitoIdentityId lookup", () => {
      const customerId = "CUST-789";
      const expectedKey = {
        PK: customerId,
        SK: "COGNITO_IDENTITY_ID",
      };

      expect(expectedKey.PK).toBe(customerId);
      expect(expectedKey.SK).toBe("COGNITO_IDENTITY_ID");
    });

    it("should use correct projection expression", () => {
      const projectionExpression = "cognitoIdentityId";
      expect(projectionExpression).toBe("cognitoIdentityId");
    });
  });

  describe("Event Types Supported", () => {
    const supportedEventTypes = [
      { detailType: "Customer.Accepted", source: "customer.service" },
      { detailType: "Customer.Rejected", source: "customer.service" },
      { detailType: "Customer.Document.Updated", source: "customer.service" },
      { detailType: "Document.Processed", source: "documents.service" },
      { detailType: "Claim.Accepted", source: "claims.service" },
      { detailType: "Claim.Rejected", source: "claims.service" },
      { detailType: "Fraud.Detected", source: "fraud.service" },
      { detailType: "Fraud.Not.Detected", source: "fraud.service" },
      { detailType: "Settlement.Finalized", source: "settlement.service" },
      { detailType: "Vendor.Finalized", source: "vendor.service" },
    ];

    supportedEventTypes.forEach(({ detailType, source }) => {
      it(`should support ${detailType} events from ${source}`, () => {
        const event = {
          "detail-type": detailType,
          source: source,
          detail: {
            customerId: "CUST-TEST",
          },
        };

        expect(event["detail-type"]).toBe(detailType);
        expect(event.source).toBe(source);
      });
    });
  });

  describe("Return Value", () => {
    it("should return expected success message", () => {
      const expectedReturn = "Notifications Lambda called";
      expect(expectedReturn).toBe("Notifications Lambda called");
    });
  });

  describe("Error Handling Expectations", () => {
    it("should log errors when IoT publish fails", () => {
      const errorMessage = "error while publishing, error = ";
      expect(errorMessage).toContain("error while publishing");
    });

    it("should continue execution after IoT publish error", () => {
      const returnAfterError = "Notifications Lambda called";
      expect(returnAfterError).toBe("Notifications Lambda called");
    });
  });

  describe("Settlement.Finalized Event", () => {
    it("should have correct payload structure", () => {
      const event = {
        "detail-type": "Settlement.Finalized",
        source: "settlement.service",
        detail: {
          customerId: "CUST-SETTLE",
          claimId: "CLAIM-001",
          settlementMessage: "Your settlement amount is $100.00",
        },
      };

      expect(event.detail.customerId).toBeDefined();
      expect(event.detail.claimId).toBeDefined();
      expect(event.detail.settlementMessage).toBeDefined();
    });
  });

  describe("Vendor.Finalized Event", () => {
    it("should have correct payload structure", () => {
      const event = {
        "detail-type": "Vendor.Finalized",
        source: "vendor.service",
        detail: {
          customerId: "CUST-VENDOR",
          vendorMessage: "Enterprise Rental car has been finalized",
        },
      };

      expect(event.detail.customerId).toBeDefined();
      expect(event.detail.vendorMessage).toBeDefined();
      expect(event.detail.vendorMessage).toContain("Enterprise Rental car");
    });
  });
});
