// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CustomerEvents } from "../lib/services/customer/infra/customer-events";
import { ClaimsEvents } from "../lib/services/claims/infra/claims-events";
import { FraudEvents } from "../lib/services/fraud/infra/fraud-events";
import { SettlementEvents } from "../lib/services/settlement/infra/settlement-service";
import { VendorEvents } from "../lib/services/vendor/infra/vendor-service";

describe("CustomerEvents", () => {
  test("should have correct CUSTOMER_SOURCE value", () => {
    expect(CustomerEvents.CUSTOMER_SOURCE).toBe("customer.service");
  });

  test("should have correct SIGNUP_SOURCE value", () => {
    expect(CustomerEvents.SIGNUP_SOURCE).toBe("signup.service");
  });

  test("should have correct CUSTOMER_ACCEPTED value", () => {
    expect(CustomerEvents.CUSTOMER_ACCEPTED).toBe("Customer.Accepted");
  });

  test("should have correct CUSTOMER_REJECTED value", () => {
    expect(CustomerEvents.CUSTOMER_REJECTED).toBe("Customer.Rejected");
  });

  test("should have correct CUSTOMER_SUBMITTED value", () => {
    expect(CustomerEvents.CUSTOMER_SUBMITTED).toBe("Customer.Submitted");
  });

  test("should have all expected enum values", () => {
    const expectedKeys = [
      "CUSTOMER_SOURCE",
      "SIGNUP_SOURCE",
      "CUSTOMER_ACCEPTED",
      "CUSTOMER_REJECTED",
      "CUSTOMER_SUBMITTED",
    ];
    const actualKeys = Object.keys(CustomerEvents).filter(
      (key) => isNaN(Number(key))
    );
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe("ClaimsEvents", () => {
  test("should have correct FNOL_SOURCE value", () => {
    expect(ClaimsEvents.FNOL_SOURCE).toBe("fnol.service");
  });

  test("should have correct CLAIMS_SOURCE value", () => {
    expect(ClaimsEvents.CLAIMS_SOURCE).toBe("claims.service");
  });

  test("should have correct CLAIM_ACCEPTED value", () => {
    expect(ClaimsEvents.CLAIM_ACCEPTED).toBe("Claim.Accepted");
  });

  test("should have correct CLAIM_REJECTED value", () => {
    expect(ClaimsEvents.CLAIM_REJECTED).toBe("Claim.Rejected");
  });

  test("should have correct CLAIM_REQUESTED value", () => {
    expect(ClaimsEvents.CLAIM_REQUESTED).toBe("Claim.Requested");
  });

  test("should have all expected enum values", () => {
    const expectedKeys = [
      "FNOL_SOURCE",
      "CLAIMS_SOURCE",
      "CLAIM_ACCEPTED",
      "CLAIM_REJECTED",
      "CLAIM_REQUESTED",
    ];
    const actualKeys = Object.keys(ClaimsEvents).filter(
      (key) => isNaN(Number(key))
    );
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe("FraudEvents", () => {
  test("should have correct SOURCE value", () => {
    expect(FraudEvents.SOURCE).toBe("fraud.service");
  });

  test("should have correct FRAUD_DETECTED value", () => {
    expect(FraudEvents.FRAUD_DETECTED).toBe("Fraud.Detected");
  });

  test("should have correct FRAUD_NOT_DETECTED value", () => {
    expect(FraudEvents.FRAUD_NOT_DETECTED).toBe("Fraud.Not.Detected");
  });

  test("should have all expected enum values", () => {
    const expectedKeys = ["SOURCE", "FRAUD_DETECTED", "FRAUD_NOT_DETECTED"];
    const actualKeys = Object.keys(FraudEvents).filter(
      (key) => isNaN(Number(key))
    );
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe("SettlementEvents", () => {
  test("should have correct SOURCE value", () => {
    expect(SettlementEvents.SOURCE).toBe("settlement.service");
  });

  test("should have correct SETTLEMENT_FINALIZED value", () => {
    expect(SettlementEvents.SETTLEMENT_FINALIZED).toBe("Settlement.Finalized");
  });

  test("should have all expected enum values", () => {
    const expectedKeys = ["SOURCE", "SETTLEMENT_FINALIZED"];
    const actualKeys = Object.keys(SettlementEvents).filter(
      (key) => isNaN(Number(key))
    );
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe("VendorEvents", () => {
  test("should have correct SOURCE value", () => {
    expect(VendorEvents.SOURCE).toBe("vendor.service");
  });

  test("should have correct VENDOR_FINALIZED value", () => {
    expect(VendorEvents.VENDOR_FINALIZED).toBe("Vendor.Finalized");
  });

  test("should have all expected enum values", () => {
    const expectedKeys = ["SOURCE", "VENDOR_FINALIZED"];
    const actualKeys = Object.keys(VendorEvents).filter(
      (key) => isNaN(Number(key))
    );
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe("Event Source Naming Conventions", () => {
  test("all event sources should follow service naming pattern", () => {
    const sources = [
      CustomerEvents.CUSTOMER_SOURCE,
      CustomerEvents.SIGNUP_SOURCE,
      ClaimsEvents.FNOL_SOURCE,
      ClaimsEvents.CLAIMS_SOURCE,
      FraudEvents.SOURCE,
      SettlementEvents.SOURCE,
      VendorEvents.SOURCE,
    ];

    sources.forEach((source) => {
      expect(source).toMatch(/^[a-z]+\.service$/);
    });
  });

  test("all event detail types should follow PascalCase naming pattern", () => {
    const detailTypes = [
      CustomerEvents.CUSTOMER_ACCEPTED,
      CustomerEvents.CUSTOMER_REJECTED,
      CustomerEvents.CUSTOMER_SUBMITTED,
      ClaimsEvents.CLAIM_ACCEPTED,
      ClaimsEvents.CLAIM_REJECTED,
      ClaimsEvents.CLAIM_REQUESTED,
      FraudEvents.FRAUD_DETECTED,
      FraudEvents.FRAUD_NOT_DETECTED,
      SettlementEvents.SETTLEMENT_FINALIZED,
      VendorEvents.VENDOR_FINALIZED,
    ];

    detailTypes.forEach((detailType) => {
      expect(detailType).toMatch(/^[A-Z][a-z]+(\.[A-Z][a-z]+)*$/);
    });
  });
});
