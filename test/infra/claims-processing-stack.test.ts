import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { ClaimsProcessingStack } from "../../lib/claims-processing-stack";

describe("ClaimsProcessingStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new ClaimsProcessingStack(app, "TestStack");
    template = Template.fromStack(stack);
  });

  describe("EventBridge Resources", () => {
    it("should create a custom EventBridge bus", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: Match.stringLikeRegexp(".*ClaimsProcessingBus"),
      });
    });

    it("should create a wildcard capture rule", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "WildcardCaptureAllEventsRule",
      });
    });

    it("should create a schema discoverer", () => {
      template.hasResource("AWS::EventSchemas::Discoverer", {});
    });
  });

  describe("Log Group Resources", () => {
    it("should create an all-events log group with 1 week retention", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 7,
      });
    });
  });

  describe("DynamoDB Resources", () => {
    it("should create DynamoDB tables for the services", () => {
      const tables = template.findResources("AWS::DynamoDB::Table");
      expect(Object.keys(tables).length).toBeGreaterThan(0);
    });
  });

  describe("Lambda Resources", () => {
    it("should create Lambda functions", () => {
      const lambdas = template.findResources("AWS::Lambda::Function");
      expect(Object.keys(lambdas).length).toBeGreaterThan(0);
    });
  });

  describe("CloudWatch Dashboard", () => {
    it("should create a CloudWatch dashboard", () => {
      const dashboards = template.findResources("AWS::CloudWatch::Dashboard");
      expect(Object.keys(dashboards).length).toBeGreaterThan(0);
    });
  });

  describe("S3 Resources", () => {
    it("should create an S3 bucket for documents", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      expect(Object.keys(buckets).length).toBeGreaterThan(0);
    });
  });

  describe("SQS Resources", () => {
    it("should create SQS queues", () => {
      const queues = template.findResources("AWS::SQS::Queue");
      expect(Object.keys(queues).length).toBeGreaterThan(0);
    });
  });
});
