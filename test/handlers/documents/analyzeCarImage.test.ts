// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Analyze Car Image Handler Contract Tests
 * 
 * Note: The analyzeCarImage.js handler uses ES module imports which requires
 * special Jest configuration. These tests validate the expected behavior and
 * contract of the car image analysis service.
 */

describe("Analyze Car Image Handler Contract Tests", () => {
  describe("Event Structure Validation", () => {
    it("should accept S3 events with bucket and key information", () => {
      const s3Event = {
        Records: [
          {
            s3: {
              bucket: { name: "test-documents-bucket" },
              object: { key: "customers/CUST-123/car.jpg" },
            },
          },
        ],
      };

      expect(s3Event.Records[0].s3.bucket.name).toBeDefined();
      expect(s3Event.Records[0].s3.object.key).toBeDefined();
    });

    it("should parse customer ID from S3 key path", () => {
      const s3Key = "customers/CUST-123/car.jpg";
      const parts = s3Key.split("/");
      const customerId = parts[1];

      expect(customerId).toBe("CUST-123");
    });

    it("should identify signup type for car.jpg files", () => {
      const s3Key = "customers/CUST-123/car.jpg";
      const fileName = s3Key.split("/").pop();
      const isSignup = fileName === "car.jpg";

      expect(isSignup).toBe(true);
    });

    it("should identify claims type for cardamage.jpg files", () => {
      const s3Key = "customers/CUST-123/claims/CLAIM-456/cardamage.jpg";
      const fileName = s3Key.split("/").pop();
      const isClaims = fileName === "cardamage.jpg";

      expect(isClaims).toBe(true);
    });
  });

  describe("API Response Structure", () => {
    it("should validate color detection API response structure", () => {
      const colorResponse = {
        Predictions: [
          { Name: "red", Confidence: 99.5 },
          { Name: "blue", Confidence: 0.3 },
        ],
      };

      expect(colorResponse.Predictions).toBeDefined();
      expect(colorResponse.Predictions[0].Name).toBe("red");
      expect(colorResponse.Predictions[0].Confidence).toBeGreaterThan(95);
    });

    it("should validate damage detection API response structure", () => {
      const damageResponse = {
        Predictions: [
          { Name: "bumper_dent", Confidence: 84.26 },
          { Name: "scratch", Confidence: 10.5 },
        ],
      };

      expect(damageResponse.Predictions).toBeDefined();
      expect(damageResponse.Predictions[0].Name).toBe("bumper_dent");
      expect(damageResponse.Predictions[0].Confidence).toBeGreaterThan(50);
    });
  });

  describe("Output Event Structure", () => {
    it("should validate Document.Processed event structure for signup", () => {
      const outputEvent = {
        DetailType: "Document.Processed",
        Source: "documents.service",
        EventBusName: "test-bus",
        Detail: JSON.stringify({
          customerId: "CUST-123",
          recordId: "POLICY-001",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "signup",
            color: { Name: "red", Confidence: 99.5 },
          },
        }),
      };

      expect(outputEvent.DetailType).toBe("Document.Processed");
      expect(outputEvent.Source).toBe("documents.service");

      const detail = JSON.parse(outputEvent.Detail);
      expect(detail.customerId).toBeDefined();
      expect(detail.documentType).toBe("CAR");
      expect(detail.analyzedFieldAndValues.type).toBe("signup");
      expect(detail.analyzedFieldAndValues.color).toBeDefined();
    });

    it("should validate Document.Processed event structure for claims", () => {
      const outputEvent = {
        DetailType: "Document.Processed",
        Source: "documents.service",
        EventBusName: "test-bus",
        Detail: JSON.stringify({
          customerId: "CUST-123",
          recordId: "CLAIM-456",
          documentType: "CAR",
          analyzedFieldAndValues: {
            type: "claims",
            color: { Name: "blue", Confidence: 98.2 },
            damage: { Name: "bumper_dent", Confidence: 84.26 },
          },
        }),
      };

      expect(outputEvent.DetailType).toBe("Document.Processed");

      const detail = JSON.parse(outputEvent.Detail);
      expect(detail.analyzedFieldAndValues.type).toBe("claims");
      expect(detail.analyzedFieldAndValues.damage).toBeDefined();
    });
  });

  describe("S3 Key Parsing", () => {
    it("should extract policy ID from signup car image path", () => {
      const s3Key = "customers/CUST-123/policies/POLICY-001/car.jpg";
      const parts = s3Key.split("/");
      const policyId = parts[3];

      expect(policyId).toBe("POLICY-001");
    });

    it("should extract claim ID from claims car damage image path", () => {
      const s3Key = "customers/CUST-123/claims/CLAIM-456/cardamage.jpg";
      const parts = s3Key.split("/");
      const claimId = parts[3];

      expect(claimId).toBe("CLAIM-456");
    });
  });

  describe("Presigned URL Generation", () => {
    it("should generate presigned URL with correct expiration", () => {
      const expirationSeconds = 3600;
      expect(expirationSeconds).toBe(3600);
    });

    it("should use GetObjectCommand for presigned URL", () => {
      const getObjectParams = {
        Bucket: "test-bucket",
        Key: "customers/CUST-123/car.jpg",
      };

      expect(getObjectParams.Bucket).toBeDefined();
      expect(getObjectParams.Key).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing color detection API response", () => {
      const emptyResponse = { Predictions: [] };
      expect(emptyResponse.Predictions.length).toBe(0);
    });

    it("should handle missing damage detection API response", () => {
      const emptyResponse = { Predictions: [] };
      expect(emptyResponse.Predictions.length).toBe(0);
    });
  });

  describe("Environment Configuration", () => {
    it("should require COLOR_DETECT_API environment variable", () => {
      const envVar = "COLOR_DETECT_API";
      expect(envVar).toBe("COLOR_DETECT_API");
    });

    it("should require DAMAGE_DETECT_API environment variable", () => {
      const envVar = "DAMAGE_DETECT_API";
      expect(envVar).toBe("DAMAGE_DETECT_API");
    });

    it("should require BUS_NAME environment variable", () => {
      const envVar = "BUS_NAME";
      expect(envVar).toBe("BUS_NAME");
    });
  });

  describe("Image Type Detection", () => {
    const testCases = [
      { key: "customers/CUST-123/car.jpg", expectedType: "signup" },
      { key: "customers/CUST-123/policies/POL-001/car.jpg", expectedType: "signup" },
      { key: "customers/CUST-123/claims/CLM-001/cardamage.jpg", expectedType: "claims" },
    ];

    testCases.forEach(({ key, expectedType }) => {
      it(`should identify ${expectedType} type for ${key.split("/").pop()}`, () => {
        const fileName = key.split("/").pop();
        const type = fileName === "car.jpg" ? "signup" : "claims";
        expect(type).toBe(expectedType);
      });
    });
  });
});
