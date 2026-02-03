// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Customer Input Validator Lambda Handler
 *
 * This Lambda function validates customer input fields during the registration
 * workflow. It is invoked by Step Functions to verify email addresses and
 * Social Security Numbers before proceeding with customer creation.
 *
 * Supported Validation Types:
 * - email: Validates email format using the email-validator library
 * - ssn: Validates SSN format (XXX-XX-XXXX or XXXXXXXXX)
 *
 * The function processes an array of validation requests and returns false
 * if any validation fails (fail-fast behavior).
 */

/**
 * Regular expression for validating US Social Security Numbers.
 * Accepts formats: XXX-XX-XXXX or XXXXXXXXX (with or without dashes)
 */
const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
const validator = require("email-validator");

/**
 * Lambda handler for validating customer input fields.
 *
 * @param {Array<Object>} event - Array of validation requests
 * @param {string} event[].type - Type of validation ('email' or 'ssn')
 * @param {string} event[].value - Value to validate
 * @param {Object} context - Lambda context object
 * @returns {boolean} True if all validations pass, false otherwise
 */
exports.handler = async function (event, context) {
  let isValid = false;

  if (event && event.length && event.length > 0) {
    for (let index = 0; index < event.length; index++) {
      const element = event[index];
      switch (element.type) {
        case "email":
          isValid = validator.validate(element.value);
          break;
        case "ssn":
          isValid = ssnRegex.test(element.value);
          break;
        default:
          isValid = false;
      }
      if (!isValid) break;
    }
  }

  console.log("event = ", event);
  return isValid;
};
