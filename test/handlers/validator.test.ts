const validatorModule = require("../../lib/services/customer/app/handlers/validator");

describe("Validator Handler", () => {
  const handler = validatorModule.handler;

  describe("Email Validation", () => {
    it("should return true for a valid email", async () => {
      const event = [{ type: "email", value: "test@example.com" }];
      const result = await handler(event, {});
      expect(result).toBe(true);
    });

    it("should return false for an invalid email without @", async () => {
      const event = [{ type: "email", value: "testexample.com" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for an invalid email without domain", async () => {
      const event = [{ type: "email", value: "test@" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for an empty email", async () => {
      const event = [{ type: "email", value: "" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return true for email with subdomain", async () => {
      const event = [{ type: "email", value: "user@mail.example.com" }];
      const result = await handler(event, {});
      expect(result).toBe(true);
    });
  });

  describe("SSN Validation", () => {
    it("should return true for a valid SSN with dashes", async () => {
      const event = [{ type: "ssn", value: "123-45-6789" }];
      const result = await handler(event, {});
      expect(result).toBe(true);
    });

    it("should return true for a valid SSN without dashes", async () => {
      const event = [{ type: "ssn", value: "123456789" }];
      const result = await handler(event, {});
      expect(result).toBe(true);
    });

    it("should return false for an SSN with too few digits", async () => {
      const event = [{ type: "ssn", value: "123-45-678" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for an SSN with too many digits", async () => {
      const event = [{ type: "ssn", value: "123-45-67890" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for an SSN with letters", async () => {
      const event = [{ type: "ssn", value: "abc-de-fghi" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for an empty SSN", async () => {
      const event = [{ type: "ssn", value: "" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });
  });

  describe("Multiple Validations", () => {
    it("should return true when all validations pass", async () => {
      const event = [
        { type: "email", value: "test@example.com" },
        { type: "ssn", value: "123-45-6789" },
      ];
      const result = await handler(event, {});
      expect(result).toBe(true);
    });

    it("should return false if any validation fails", async () => {
      const event = [
        { type: "email", value: "test@example.com" },
        { type: "ssn", value: "invalid-ssn" },
      ];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false if first validation fails", async () => {
      const event = [
        { type: "email", value: "invalid-email" },
        { type: "ssn", value: "123-45-6789" },
      ];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for empty event array", async () => {
      const event: any[] = [];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });

    it("should return false for null event", async () => {
      const result = await handler(null, {});
      expect(result).toBe(false);
    });

    it("should return false for undefined event", async () => {
      const result = await handler(undefined, {});
      expect(result).toBe(false);
    });

    it("should return false for unknown validation type", async () => {
      const event = [{ type: "phone", value: "1234567890" }];
      const result = await handler(event, {});
      expect(result).toBe(false);
    });
  });
});
