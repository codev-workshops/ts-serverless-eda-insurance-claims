// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Claims Processing Stack
 *
 * This is the main CDK stack that orchestrates the entire serverless event-driven
 * insurance claims processing system. It creates and wires together all the
 * microservices, the central EventBridge bus, and observability components.
 *
 * Architecture Overview:
 * - Central EventBridge bus for asynchronous service communication
 * - Document Service: Processes uploaded documents using Textract/Rekognition
 * - Customer Service: Manages customer registration and policy data
 * - Claims Service: Handles First Notice of Loss (FNOL) submissions
 * - Fraud Service: Validates data consistency and detects potential fraud
 * - Settlement Service: Calculates claim settlements (Spring Boot on ECS Fargate)
 * - Vendor Service: Manages rental car vendor selection (NodeJS on EKS with KEDA)
 * - Notifications Service: Pushes real-time updates to frontend via AWS IoT
 *
 * Event Flow:
 * User Action -> API Gateway -> Lambda -> EventBridge -> [Services] -> IoT -> Frontend
 */

import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { CleanupService } from "./cleanup/infra/cleanup-service";
import { ClaimsProcessingCWDashboard } from "./observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import createMetricsQueueWithLambdaSubscription from "./observability/cw-dashboard/infra/createMetric";
import { ClaimsEvents } from "./services/claims/infra/claims-events";
import { ClaimsService } from "./services/claims/infra/claims-service";
import { CustomerEvents } from "./services/customer/infra/customer-events";
import { CustomerService } from "./services/customer/infra/customer-service";
import { DocumentsEvents } from "./services/documents/infra/documents-events";
import { DocumentService } from "./services/documents/infra/documents-service";
import { FraudEvents } from "./services/fraud/infra/fraud-events";
import { FraudService } from "./services/fraud/infra/fraud-service";
import { NotificationsService } from "./services/notifications/infra/notifications-service";
import { SettlementEvents, SettlementService } from "./services/settlement/infra/settlement-service";
import { CfnDiscoverer } from "aws-cdk-lib/aws-eventschemas";
import { VendorEvents, VendorService } from "./services/vendor/infra/vendor-service";

/**
 * Main CDK Stack for the Insurance Claims Processing System.
 *
 * This stack creates all AWS resources needed for the event-driven architecture,
 * including the EventBridge bus, all microservices, and observability components.
 */
export class ClaimsProcessingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stackName = Stack.of(this).stackName;
    const region = Stack.of(this).region;

    /**
     * Central EventBridge Custom Event Bus
     *
     * This is the backbone of the event-driven architecture. All services publish
     * and subscribe to events through this bus, enabling loose coupling and
     * independent scaling of microservices.
     */
    const bus = new EventBus(this, "CustomBus", {
      eventBusName: `${stackName}-ClaimsProcessingBus`,
    });

    /**
     * EventBridge Schema Discoverer
     *
     * Automatically discovers and documents event schemas published to the bus.
     * This enables the EventBridge Schema Registry to generate code bindings
     * and provides visibility into the event contracts between services.
     */
    new CfnDiscoverer(this, "SchemaDiscoverer", {
      sourceArn: bus.eventBusArn
    });

    /**
     * Document Service
     *
     * Processes uploaded documents (driver's licenses and vehicle photos) using
     * AWS Textract for ID document analysis and Rekognition for image classification.
     * Also integrates with external APIs for color and damage detection.
     */
    const documentService = new DocumentService(this, "DocumentService", {
      bus,
    });

    /**
     * CloudWatch Log Group for All Events
     *
     * Captures all events flowing through the EventBridge bus for audit trails,
     * debugging, and observability purposes. Events are retained for one week.
     */
    const allEventsLogGroup = new LogGroup(this, "AllEventsLogGroup", {
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Customer Service
     *
     * Manages customer registration, profile data, and insurance policies.
     * Provides APIs for signup and customer retrieval, and uses Step Functions
     * for orchestrating the customer onboarding workflow.
     */
    const customerService = new CustomerService(this, "CustomerService", {
      bus,
      documentsBucket: documentService.documentsBucket,
    });
    const customerTable = customerService.customerTable;
    const policyTable = customerService.policyTable;

    /**
     * Claims Service
     *
     * Handles First Notice of Loss (FNOL) submissions from customers.
     * Validates policy coverage, verifies personal information, and creates
     * claim records. Generates pre-signed URLs for damage photo uploads.
     */
    const claimsService = new ClaimsService(this, "ClaimsService", {
      bus,
      customerTable,
      policyTable,
      documentsBucket: documentService.documentsBucket,
    });
    const claimsTable = claimsService.claimsTable;

    /**
     * Fraud Service
     *
     * Performs fraud detection by validating data consistency across documents
     * and submissions. Checks include name matching between registration and
     * driver's license, and vehicle color verification against policy records.
     */
    const fraudService = new FraudService(this, "FraudService", {
      bus,
      customerTable,
      policyTable,
      claimsTable,
    });

    /**
     * Settlement Service
     *
     * Spring Boot application running on ECS Fargate that calculates claim
     * settlement amounts based on damage analysis. Consumes Fraud.Not.Detected
     * events via SQS and publishes Settlement.Finalized events.
     */
    const settlementService = new SettlementService(this, "SettlementService", {
      bus,
    });

    /**
     * Vendor Service
     *
     * NodeJS Express application running on Amazon EKS with KEDA for event-driven
     * autoscaling. Contacts rental car vendors after settlement is finalized
     * and arranges temporary vehicle rentals for customers.
     */
    const vendorService = new VendorService(this, "VendorService", {
      bus
    });

    /**
     * Notifications Service
     *
     * Bridges EventBridge events to AWS IoT Core for real-time frontend updates.
     * Subscribes to all key business events and publishes them to user-specific
     * IoT topics, enabling the React frontend to display live status updates.
     */
    new NotificationsService(this, "NotificationsService", {
      bus,
      customerTable,
      eventPattern: {
        detailType: [
          CustomerEvents.CUSTOMER_ACCEPTED,
          CustomerEvents.CUSTOMER_REJECTED,
          ClaimsEvents.CLAIM_ACCEPTED,
          ClaimsEvents.CLAIM_REJECTED,
          DocumentsEvents.DOCUMENT_PROCESSED,
          FraudEvents.FRAUD_DETECTED,
          FraudEvents.FRAUD_NOT_DETECTED,
          SettlementEvents.SETTLEMENT_FINALIZED,
          VendorEvents.VENDOR_FINALIZED
        ],
      },
    });

    /**
     * Cleanup Service
     *
     * Development utility that provides an API to delete all data for the
     * current user. Useful for testing and demonstration purposes.
     * Grants read/write access to all data stores.
     */
    const cleanupService = new CleanupService(this, "CleanupService", {
      customerTableName: customerTable.tableName,
      policyTableName: policyTable.tableName,
      claimsTableName: claimsTable.tableName,
      settlementTableName: settlementService.table.tableName,
      documentsBucketName: documentService.documentsBucket.bucketName,
    });

    customerTable.grantReadWriteData(cleanupService.cleanupLambdaFunction);
    policyTable.grantReadWriteData(cleanupService.cleanupLambdaFunction);
    claimsTable.grantReadWriteData(cleanupService.cleanupLambdaFunction);
    documentService.documentsBucket.grantReadWrite(
      cleanupService.cleanupLambdaFunction
    );
    settlementService.table.grantReadWriteData(cleanupService.cleanupLambdaFunction);

    /**
     * Metrics Queue with Lambda Subscription
     *
     * SQS queue that receives all events for custom CloudWatch metrics processing.
     * A Lambda function consumes these events and creates custom metrics for
     * the observability dashboard.
     */
    const metricsQueueWithLambdaSubscription =
      createMetricsQueueWithLambdaSubscription(this);

    /**
     * Wildcard Event Capture Rule
     *
     * EventBridge rule that captures ALL events from all service sources.
     * Routes events to CloudWatch Logs for audit/debugging and to the
     * metrics queue for custom metrics generation.
     */
    new Rule(this, "WildcardCaptureAllEventsRule", {
      eventBus: bus,
      ruleName: "WildcardCaptureAllEventsRule",
      eventPattern: {
        source: [
          CustomerEvents.CUSTOMER_SOURCE,
          CustomerEvents.SIGNUP_SOURCE,
          ClaimsEvents.FNOL_SOURCE,
          ClaimsEvents.CLAIMS_SOURCE,
          DocumentsEvents.SOURCE,
          FraudEvents.SOURCE,
          SettlementEvents.SOURCE,
          VendorEvents.SOURCE,
          "aws.s3",
        ],
      },
      targets: [
        new CloudWatchLogGroup(allEventsLogGroup),
        new SqsQueue(metricsQueueWithLambdaSubscription),
      ],
    });

    /**
     * CloudWatch Dashboard
     *
     * Aggregates metrics from all services into a single dashboard for
     * operational visibility. Displays widgets for customer, claims, fraud,
     * documents, settlement, and vendor service metrics.
     */
    new ClaimsProcessingCWDashboard(this, "ClaimsProcessingCWDashboard", {
      dashboardName: `${stackName}-${region}-Claims-Processing-Dashboard`,
      graphWidgets: [
        customerService.customerMetricsWidget,
        claimsService.claimsMetricsWidget,
        fraudService.fraudMetricsWidget,
        documentService.documentsMetricsWidget,
        settlementService.settlementMetricsWidget,
        vendorService.vendorMetricsWidget,
      ],
    });
  }
}
