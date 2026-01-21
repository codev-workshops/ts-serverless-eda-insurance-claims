// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import config from "../lib/config";

describe("Config", () => {
  test("should have COLOR_DETECT_API defined", () => {
    expect(config.COLOR_DETECT_API).toBeDefined();
  });

  test("should have DAMAGE_DETECT_API defined", () => {
    expect(config.DAMAGE_DETECT_API).toBeDefined();
  });

  test("COLOR_DETECT_API should be a valid URL", () => {
    expect(config.COLOR_DETECT_API).toMatch(/^https?:\/\/.+/);
  });

  test("DAMAGE_DETECT_API should be a valid URL", () => {
    expect(config.DAMAGE_DETECT_API).toMatch(/^https?:\/\/.+/);
  });

  test("config should have exactly two API endpoints", () => {
    const configKeys = Object.keys(config);
    expect(configKeys).toHaveLength(2);
    expect(configKeys).toContain("COLOR_DETECT_API");
    expect(configKeys).toContain("DAMAGE_DETECT_API");
  });

  test("API endpoints should use HTTPS", () => {
    expect(config.COLOR_DETECT_API).toMatch(/^https:\/\/.+/);
    expect(config.DAMAGE_DETECT_API).toMatch(/^https:\/\/.+/);
  });
});
