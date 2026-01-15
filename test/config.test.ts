// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import config from '../lib/config';

describe('Config', () => {
  it('should export a config object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should have COLOR_DETECT_API defined', () => {
    expect(config.COLOR_DETECT_API).toBeDefined();
    expect(typeof config.COLOR_DETECT_API).toBe('string');
    expect(config.COLOR_DETECT_API).toMatch(/^https?:\/\//);
  });

  it('should have DAMAGE_DETECT_API defined', () => {
    expect(config.DAMAGE_DETECT_API).toBeDefined();
    expect(typeof config.DAMAGE_DETECT_API).toBe('string');
    expect(config.DAMAGE_DETECT_API).toMatch(/^https?:\/\//);
  });

  it('should have valid webhook.site URLs', () => {
    expect(config.COLOR_DETECT_API).toContain('webhook.site');
    expect(config.DAMAGE_DETECT_API).toContain('webhook.site');
  });
});
