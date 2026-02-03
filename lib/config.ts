// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * External API Configuration
 *
 * This module contains configuration for external APIs used by the Document Service
 * for vehicle image analysis. In this demo application, webhook.site endpoints are
 * used to simulate ML-based color and damage detection APIs.
 *
 * In a production environment, these would be replaced with actual ML inference
 * endpoints (e.g., Amazon SageMaker endpoints or third-party APIs).
 *
 * API Response Format:
 * Both APIs return predictions in the format:
 * { "Predictions": [{ "Name": "<detected_value>", "Confidence": <0-100> }] }
 */
const config = {
  /**
   * Vehicle Color Detection API
   *
   * Analyzes vehicle images to detect the primary color.
   * Used during signup to verify the vehicle color matches the policy,
   * and during claims to validate the damaged vehicle.
   *
   * Current configuration: Returns "green" with high confidence
   * Alternative (commented): Returns "red" for testing different scenarios
   */
  COLOR_DETECT_API:
    "https://webhook.site/a991642a-33f3-44a1-a037-abf395b84113",

  // Alternative: Red Color Car detection endpoint
  // Returns: { "Predictions": [{ "Name": "red", "Confidence": 97.56799774169922 }] }
  // COLOR_DETECT_API: "https://webhook.site/fb720eb9-e701-4376-9ffc-3f30f7691632/",

  /**
   * Vehicle Damage Detection API
   *
   * Analyzes vehicle images to detect and classify damage types.
   * Used during claims processing to assess the type and severity of damage.
   *
   * Current configuration: Returns "bumper_dent" damage type
   * Alternative (commented): Returns "unknown" for no damage detected
   */
  DAMAGE_DETECT_API:
    "https://webhook.site/fae02cbf-75e8-4907-8063-526ae5d5dcaa",

  // Alternative: No Damage detection endpoint
  // Returns: { "Predictions": [{ "Name": "unknown", "Confidence": 99.98300170898438 }] }
  // DAMAGE_DETECT_API: "https://webhook.site/b02ce4de-739a-4cb8-bae1-c904b4516aa5/",
};

export default config;
