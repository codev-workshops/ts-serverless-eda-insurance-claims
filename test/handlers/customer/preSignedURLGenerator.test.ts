// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export {};

const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({})),
  PutObjectCommand: jest.fn((params) => params),
}));

describe("PreSignedURLGenerator Handler", () => {
  let handler: (event: any) => Promise<any>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockGetSignedUrl.mockReset();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
    };
    handler = require("../../../lib/services/customer/app/handlers/preSignedURLGenerator").handler;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return empty object when no urlreq provided", async () => {
    const event = {};
    const result = await handler(event);
    expect(result).toEqual({});
  });

  it("should return empty object when urlreq is empty array", async () => {
    const event = { urlreq: [] };
    const result = await handler(event);
    expect(result).toEqual({});
  });

  it("should generate presigned URL for single request", async () => {
    mockGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/bucket/key?signed=true");

    const event = {
      urlreq: [
        {
          id: "driversLicense",
          Bucket: "test-bucket",
          Key: "customers/123/documents/dl.jpg",
          ContentType: "image/jpeg",
        },
      ],
    };

    const result = await handler(event);

    expect(result).toHaveProperty("driversLicense");
    expect(result.driversLicense).toBe("https://s3.amazonaws.com/bucket/key?signed=true");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("should generate presigned URLs for multiple requests", async () => {
    mockGetSignedUrl
      .mockResolvedValueOnce("https://s3.amazonaws.com/bucket/dl?signed=true")
      .mockResolvedValueOnce("https://s3.amazonaws.com/bucket/car?signed=true");

    const event = {
      urlreq: [
        {
          id: "driversLicense",
          Bucket: "test-bucket",
          Key: "customers/123/documents/dl.jpg",
          ContentType: "image/jpeg",
        },
        {
          id: "carPhoto",
          Bucket: "test-bucket",
          Key: "customers/123/documents/car.jpg",
          ContentType: "image/jpeg",
        },
      ],
    };

    const result = await handler(event);

    expect(result).toHaveProperty("driversLicense");
    expect(result).toHaveProperty("carPhoto");
    expect(result.driversLicense).toBe("https://s3.amazonaws.com/bucket/dl?signed=true");
    expect(result.carPhoto).toBe("https://s3.amazonaws.com/bucket/car?signed=true");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
  });

  it("should use correct expiration time", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed-url.com");

    const event = {
      urlreq: [
        {
          id: "test",
          Bucket: "bucket",
          Key: "key",
        },
      ],
    };

    await handler(event);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 }
    );
  });

  it("should create PutObjectCommand with correct parameters", async () => {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    mockGetSignedUrl.mockResolvedValue("https://signed-url.com");

    const event = {
      urlreq: [
        {
          id: "document",
          Bucket: "my-bucket",
          Key: "path/to/file.pdf",
          ContentType: "application/pdf",
        },
      ],
    };

    await handler(event);

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "path/to/file.pdf",
      ContentType: "application/pdf",
    });
  });

  it("should remove id from PutObjectCommand params", async () => {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    mockGetSignedUrl.mockResolvedValue("https://signed-url.com");

    const event = {
      urlreq: [
        {
          id: "shouldBeRemoved",
          Bucket: "bucket",
          Key: "key",
        },
      ],
    };

    await handler(event);

    const callArgs = PutObjectCommand.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("id");
  });
});
