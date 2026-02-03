// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Textract Response Transformer Lambda Handler
 *
 * This Lambda function transforms the raw response from AWS Textract's
 * AnalyzeID API into a simplified key-value format. It filters results
 * to only include fields with high confidence (>95%) and converts the
 * nested Textract structure into a flat object.
 *
 * Input Format (from Textract AnalyzeID):
 * {
 *   IdentityDocuments: [{
 *     { Type: { Text: "FIRST_NAME" }, ValueDetection: { Text: "John", Confidence: 99.5 } },
 *     ...
 *   }]
 * }
 *
 * Output Format:
 * { "FIRST_NAME": "John", "LAST_NAME": "Doe", "DOCUMENT_NUMBER": "D1234567", ... }
 */

/**
 * Lambda handler for transforming Textract AnalyzeID responses.
 *
 * @param {Object} event - Textract AnalyzeID response
 * @param {Array} event.IdentityDocuments - Array of analyzed identity documents
 * @returns {Object} Simplified key-value pairs of extracted fields with >95% confidence
 */
exports.handler = async (event) => {
  let result = {};

  if (
    !event.IdentityDocuments ||
    !Array.isArray(event.IdentityDocuments) ||
    !event.IdentityDocuments.length
  ) {
    return result;
  }

  return event.IdentityDocuments[0]
    .filter((val) => val.ValueDetection.Confidence > 95)
    .map((val) => ({ [val.Type.Text]: val.ValueDetection.Text }))
    .reduce((obj, item) => {
      const key = Object.keys(item)[0];
      return {
        ...obj,
        [key]: item[key],
      };
    }, result);
};
