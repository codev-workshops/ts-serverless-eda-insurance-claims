// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Car Image Analysis Lambda Handler
 *
 * This Lambda function analyzes vehicle images uploaded to S3 using external
 * ML APIs for color detection and damage assessment. It is triggered by S3
 * events when customers upload vehicle photos during signup or claims.
 *
 * Analysis Types:
 * - Color Detection: Identifies the primary color of the vehicle
 * - Damage Detection: Identifies damage types (e.g., bumper_dent, unknown)
 *
 * The function determines the context (signup vs claims) based on the S3 key
 * and returns the analysis results for downstream fraud detection.
 *
 * Environment Variables:
 * - COLOR_DETECT_API: External API endpoint for color detection
 * - DAMAGE_DETECT_API: External API endpoint for damage detection
 * - AWS_REGION: AWS region for S3 client
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: process.env.AWS_REGION });
const https = require("node:https");
import { Buffer } from "node:buffer";

/**
 * Lambda handler for analyzing car images.
 *
 * @param {Object} event - S3 event notification containing bucket and object info
 * @param {Object} event.detail.bucket - S3 bucket information
 * @param {Object} event.detail.object - S3 object information including key
 * @returns {Object} Analysis results with color, damage, and context type
 */
exports.handler = async function (event) {
  let resp = {};
  let analyzedFieldAndValues = {};

  if (!process.env.COLOR_DETECT_API || !process.env.DAMAGE_DETECT_API) {
    console.error(
      "Color or Damage detection API endpoint has not been specified under lib/config.ts"
    );
  }

  const buffer = await getImageFromS3(event);

  await analyzeForColor(buffer, analyzedFieldAndValues);

  await analyzeForDamage(buffer, analyzedFieldAndValues);

  resp["analyzedFieldAndValues"] = analyzedFieldAndValues;

  let type = "";
  if (event.detail.object.key.endsWith("car.jpg")) {
    type = "signup";
  } else if (event.detail.object.key.endsWith("damagedCar.jpg")) {
    type = "claims";
  }

  resp["type"] = type;

  return resp;
};

/**
 * Analyzes the image for vehicle damage using the external damage detection API.
 *
 * @param {Buffer} buffer - Image data as a buffer
 * @param {Object} analyzedFieldAndValues - Object to store analysis results
 */
async function analyzeForDamage(buffer, analyzedFieldAndValues) {
  const getDamageAPIOptions = {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
    },
  };

  const getDamageResp = await callAPI(
    process.env.DAMAGE_DETECT_API,
    getDamageAPIOptions,
    buffer
  );
  const getDamageRespJson = JSON.parse(getDamageResp);

  if (containsPrediction(getDamageRespJson)) {
    analyzedFieldAndValues["damage"] = getDamageRespJson.Predictions[0];
  }
}

/**
 * Validates that the API response contains a valid prediction.
 *
 * @param {Object} respJSON - Parsed API response
 * @returns {boolean} True if response contains valid predictions
 */
function containsPrediction(respJSON) {
  return (
    respJSON &&
    respJSON.Predictions &&
    respJSON.Predictions.length > 0 &&
    respJSON.Predictions[0]
  );
}

/**
 * Analyzes the image for vehicle color using the external color detection API.
 *
 * @param {Buffer} buffer - Image data as a buffer
 * @param {Object} analyzedFieldAndValues - Object to store analysis results
 */
async function analyzeForColor(buffer, analyzedFieldAndValues) {
  const getColorAPIOptions = {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
    },
  };

  const getColorResp = await callAPI(
    process.env.COLOR_DETECT_API,
    getColorAPIOptions,
    buffer
  );
  const getColorRespJson = JSON.parse(getColorResp);
  if (containsPrediction(getColorRespJson)) {
    analyzedFieldAndValues["color"] = getColorRespJson.Predictions[0];
  }
}

/**
 * Retrieves an image from S3 and returns it as a buffer.
 *
 * @param {Object} event - S3 event with bucket and object information
 * @returns {Promise<Buffer>} Image data as a buffer
 */
async function getImageFromS3(event) {
  const command = new GetObjectCommand({
    Bucket: event.detail.bucket.name,
    Key: event.detail.object.key,
  });

  const getObjectCommandOutput = await client.send(command);

  const chunks = [];
  for await (const chunk of getObjectCommandOutput.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Makes an HTTPS POST request to an external API with image data.
 *
 * @param {string} url - API endpoint URL
 * @param {Object} options - HTTP request options
 * @param {Buffer} buffer - Image data to send in request body
 * @returns {Promise<string>} API response as a string
 */
async function callAPI(url, options, buffer) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding("utf8");
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        console.log("No more data in response. chunks = ", chunks);
        resolve(chunks.join(""));
      });
    });

    req.on("error", (e) => {
      console.error(`problem with request: ${e.message}`);
      reject(e);
    });

    // Write data to request body
    req.write(buffer);
    req.end();
  });
}
