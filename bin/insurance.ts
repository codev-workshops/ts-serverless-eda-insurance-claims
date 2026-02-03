// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * CDK Application Entry Point
 *
 * This file serves as the main entry point for the AWS CDK application that deploys
 * the serverless event-driven insurance claims processing system. It initializes the
 * CDK app, creates the main ClaimsProcessingStack, and configures security compliance
 * checks using cdk-nag.
 *
 * The application demonstrates best practices for:
 * - Event-driven architecture using Amazon EventBridge
 * - Serverless compute with AWS Lambda, ECS Fargate, and EKS
 * - Infrastructure as Code with AWS CDK
 * - Security compliance validation with cdk-nag
 */

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { ClaimsProcessingStack } from "../lib/claims-processing-stack";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

/**
 * Initialize the CDK application instance.
 * This is the root construct that contains all stacks and resources.
 */
const app = new cdk.App();

/**
 * Enable cdk-nag AWS Solutions security checks with verbose logging.
 * cdk-nag validates the CDK application against AWS best practices and
 * security guidelines defined in the AWS Solutions Library.
 */
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}));

/**
 * Create the main ClaimsProcessingStack that orchestrates all services.
 * This stack contains the EventBridge bus, all microservices (Customer, Claims,
 * Documents, Fraud, Settlement, Vendor, Notifications), and observability components.
 */
const mStack = new ClaimsProcessingStack(app, "ClaimsProcessingStack", {});

/**
 * CDK-Nag Suppressions for Stack-Level Rules
 *
 * The following suppressions are applied to acknowledge known deviations from
 * AWS best practices. These are acceptable for this demo/POC application but
 * should be reviewed and addressed before production deployment.
 */
NagSuppressions.addStackSuppressions(mStack, [
  {
    id: "AwsSolutions-S1",
    reason: "Server access logging not required for demo.",
  },
  {
    id: "AwsSolutions-IAM4",
    reason: "Default Lambda Execution Role.",
  },
  {
    id: "AwsSolutions-IAM5",
    reason: "Will refine these permissions in next version.",
  },
  {
    id: "AwsSolutions-DDB3",
    reason: "PITR not required for demo application.",
  },
  {
    id: "AwsSolutions-APIG1",
    reason: "Access log is skipped for Settlement HTTP API.",
  },
  {
    id: "AwsSolutions-APIG2",
    reason: "Implement this when focusing on security best practices.",
  },
  {
    id: "AwsSolutions-APIG3",
    reason: "WAF not required for demo.",
  },
  {
    id: "AwsSolutions-APIG4",
    reason: "OPTIONS call for CORS does not require authentication",
  },
  {
    id: "AwsSolutions-COG4",
    reason: "OPTIONS call for CORS does not require authentication",
  },
  {
    id: "AwsSolutions-SQS3",
    reason: "DLQ not required for demo app.",
  },
  {
    id: "AwsSolutions-L1",
    reason:
      "Only functions that are left are AwsCustomResource related functions, and there's no way to specify runtime for them. These should be fixed in time automatically.  ",
  },
  {
    id: 'AwsSolutions-VPC7',
    reason: 'Not necessary for demo.'
  },
  {
    id: 'AwsSolutions-ECS4',
    reason: 'Container Insights will be added when focusing on observability throughout the app.'
  },
  {
    id: 'AwsSolutions-ECS2',
    reason: 'Not necessary to use Secrets Manager for demo purposes.'
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'Access logging Will be added when focusing on observability throughout the app.'
  },
  {
    id: 'AwsSolutions-EC23',
    reason: 'Will be modified after initial testing'
  },
  {
    id: 'AwsSolutions-SF1',
    reason: 'Logging not necessary for demo purposes'
  },
  {
    id: 'AwsSolutions-SF2',
    reason: 'X-Ray will be added eventually'
  }
], true);

/**
 * CDK-Nag Suppressions for Resource-Level Rules
 *
 * These suppressions target specific resources created by EKS cluster constructs
 * that require broader permissions for cluster management operations.
 */
NagSuppressions.addResourceSuppressions(mStack, [
  {
    id: "AwsSolutions-EKS1",
    reason: "Default VPC is used for demo purposes.",
  },
  {
    id: "AwsSolutions-IAM4",
    reason: "Default Lambda Execution Role for Lambda functions created by EKS Cluster.",
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ]
  },
  {
    id: "AwsSolutions-IAM5",
    reason: "Resources created by EKS clusters",
    appliesTo: ['Action::s3:*']
  }
], true);
