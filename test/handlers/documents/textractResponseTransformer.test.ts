// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

describe("Textract Response Transformer Handler", () => {
  let handler: (event: any) => Promise<any>;

  beforeEach(() => {
    jest.resetModules();
    handler = require("../../../lib/services/documents/app/handlers/textractResponseTransformer").handler;
  });

  describe("Valid Input Processing", () => {
    it("should transform identity documents with high confidence values", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "John", Confidence: 99.5 },
            },
            {
              Type: { Text: "LAST_NAME" },
              ValueDetection: { Text: "Doe", Confidence: 98.2 },
            },
            {
              Type: { Text: "DOCUMENT_NUMBER" },
              ValueDetection: { Text: "DL123456789", Confidence: 97.8 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({
        FIRST_NAME: "John",
        LAST_NAME: "Doe",
        DOCUMENT_NUMBER: "DL123456789",
      });
    });

    it("should filter out values with confidence below 95", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "John", Confidence: 99.0 },
            },
            {
              Type: { Text: "LAST_NAME" },
              ValueDetection: { Text: "Doe", Confidence: 94.9 },
            },
            {
              Type: { Text: "DATE_OF_BIRTH" },
              ValueDetection: { Text: "1990-01-15", Confidence: 50.0 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({
        FIRST_NAME: "John",
      });
      expect(result).not.toHaveProperty("LAST_NAME");
      expect(result).not.toHaveProperty("DATE_OF_BIRTH");
    });

    it("should include values with exactly 95 confidence", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "ADDRESS" },
              ValueDetection: { Text: "123 Main St", Confidence: 95.0 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({});
    });

    it("should include values with confidence above 95", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "ADDRESS" },
              ValueDetection: { Text: "123 Main St", Confidence: 95.1 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({
        ADDRESS: "123 Main St",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should return empty object when IdentityDocuments is undefined", async () => {
      const event = {};
      const result = await handler(event);
      expect(result).toEqual({});
    });

    it("should return empty object when IdentityDocuments is null", async () => {
      const event = { IdentityDocuments: null };
      const result = await handler(event);
      expect(result).toEqual({});
    });

    it("should return empty object when IdentityDocuments is not an array", async () => {
      const event = { IdentityDocuments: "not-an-array" };
      const result = await handler(event);
      expect(result).toEqual({});
    });

    it("should return empty object when IdentityDocuments is empty array", async () => {
      const event = { IdentityDocuments: [] };
      const result = await handler(event);
      expect(result).toEqual({});
    });

    it("should handle empty first document array", async () => {
      const event = { IdentityDocuments: [[]] };
      const result = await handler(event);
      expect(result).toEqual({});
    });
  });

  describe("Multiple Fields Processing", () => {
    it("should process all fields from a driver license", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "Jane", Confidence: 99.9 },
            },
            {
              Type: { Text: "LAST_NAME" },
              ValueDetection: { Text: "Smith", Confidence: 99.8 },
            },
            {
              Type: { Text: "DATE_OF_BIRTH" },
              ValueDetection: { Text: "1985-05-20", Confidence: 98.5 },
            },
            {
              Type: { Text: "EXPIRATION_DATE" },
              ValueDetection: { Text: "2028-05-20", Confidence: 97.2 },
            },
            {
              Type: { Text: "DOCUMENT_NUMBER" },
              ValueDetection: { Text: "S123456789", Confidence: 99.1 },
            },
            {
              Type: { Text: "ADDRESS" },
              ValueDetection: { Text: "456 Oak Ave, Seattle, WA 98101", Confidence: 96.3 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({
        FIRST_NAME: "Jane",
        LAST_NAME: "Smith",
        DATE_OF_BIRTH: "1985-05-20",
        EXPIRATION_DATE: "2028-05-20",
        DOCUMENT_NUMBER: "S123456789",
        ADDRESS: "456 Oak Ave, Seattle, WA 98101",
      });
    });

    it("should only process first identity document when multiple exist", async () => {
      const event = {
        IdentityDocuments: [
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "First", Confidence: 99.0 },
            },
          ],
          [
            {
              Type: { Text: "FIRST_NAME" },
              ValueDetection: { Text: "Second", Confidence: 99.0 },
            },
          ],
        ],
      };

      const result = await handler(event);

      expect(result).toEqual({
        FIRST_NAME: "First",
      });
    });
  });
});
