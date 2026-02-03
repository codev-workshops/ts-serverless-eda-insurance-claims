// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Vendor Service Application
 *
 * This Node.js application runs on Amazon EKS with KEDA (Kubernetes Event-Driven
 * Autoscaling) to process vendor-related tasks in the claims workflow. It consumes
 * Settlement.Finalized events from an SQS queue and coordinates with rental car
 * vendors to arrange temporary transportation for customers.
 *
 * Architecture:
 * - Runs as a containerized service on Amazon EKS
 * - Uses KEDA for event-driven autoscaling based on SQS queue depth
 * - Consumes messages using the sqs-consumer library
 * - Publishes Vendor.Finalized events to EventBridge
 *
 * Event Flow:
 * EventBridge (Settlement.Finalized) -> SQS Queue -> This Service
 *                                                 -> EventBridge (Vendor.Finalized)
 *                                                 -> Notifications -> Frontend
 *
 * Environment Variables:
 * - VENDOR_QUEUE_URL: SQS queue URL for receiving settlement events
 * - VENDOR_EVENT_SOURCE: Event source identifier for published events
 * - VENDOR_EVENT_TYPE: Event detail type for published events
 * - BUS_NAME: EventBridge bus name for publishing events
 * - AWS_REGION: AWS region for service clients
 */

const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { Consumer } = require('sqs-consumer');

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const queueURL = process.env.VENDOR_QUEUE_URL;
const eventSource = process.env.VENDOR_EVENT_SOURCE
const detailType = process.env.VENDOR_EVENT_TYPE

/**
 * SQS Consumer Application
 *
 * Creates an SQS consumer that polls the vendor queue for Settlement.Finalized
 * events. For each message, it simulates contacting rental car vendors and
 * publishes a Vendor.Finalized event with the selected vendor details.
 */
const app = Consumer.create({
  queueUrl: queueURL,
  handleMessage: async (message) => {
    let event = JSON.parse(message.Body);
    console.log(event);

    const { claimId, customerId } = event.detail;

    const vendorMessage =
      `Multiple car rental vendors were contacted for claim with id ${claimId}. Enterprise Rental car has been finalized for you to temporarily use until your car is repaired.`

    try {
      const putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            EventBusName: process.env.BUS_NAME,
            Source: eventSource,
            DetailType: detailType,
            Detail: JSON.stringify({
              customerId,
              vendorMessage
            }),
          },
        ],
      });

      const data = await ebClient.send(putEventsCommand);
      console.log("Success", data.Entries);
    } catch (error) {
      console.log("Error", error);
    }
  }
});

app.on('error', (err) => {
  console.error(err.message);
});

app.on('processing_error', (err) => {
  console.error(err.message);
});

app.start();
