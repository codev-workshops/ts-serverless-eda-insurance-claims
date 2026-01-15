import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ClaimsProcessingStack } from '../lib/claims-processing-stack';

describe('ClaimsProcessingStack', () => {
  let app: cdk.App;
  let stack: ClaimsProcessingStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new ClaimsProcessingStack(app, 'TestClaimsProcessingStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('EventBridge Resources', () => {
    it('should create an EventBridge event bus', () => {
      template.hasResourceProperties('AWS::Events::EventBus', {});
    });

    it('should create EventBridge rules', () => {
      const resources = template.findResources('AWS::Events::Rule');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('Lambda Functions', () => {
    it('should create Lambda functions', () => {
      const resources = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });

    it('should configure Lambda functions with Node.js runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: Match.stringLikeRegexp('nodejs'),
      });
    });
  });

  describe('DynamoDB Tables', () => {
    it('should create DynamoDB tables', () => {
      const resources = template.findResources('AWS::DynamoDB::Table');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });

    it('should configure DynamoDB tables with billing mode', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: Match.anyValue(),
      });
    });
  });

  describe('S3 Buckets', () => {
    it('should create S3 buckets', () => {
      const resources = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('API Gateway', () => {
    it('should create API Gateway resources', () => {
      const resources = template.findResources('AWS::ApiGatewayV2::Api');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('IAM Roles', () => {
    it('should create IAM roles for Lambda functions', () => {
      const resources = template.findResources('AWS::IAM::Role');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });

    it('should create IAM policies', () => {
      const resources = template.findResources('AWS::IAM::Policy');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('SQS Queues', () => {
    it('should create SQS queues for event processing', () => {
      const resources = template.findResources('AWS::SQS::Queue');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('CloudWatch Resources', () => {
    it('should create CloudWatch log groups', () => {
      const resources = template.findResources('AWS::Logs::LogGroup');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });

  describe('Step Functions', () => {
    it('should create Step Functions state machines', () => {
      const resources = template.findResources('AWS::StepFunctions::StateMachine');
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });
  });
});

describe('ClaimsProcessingStack Configuration', () => {
  it('should create stack with default configuration', () => {
    const app = new cdk.App();
    expect(() => {
      new ClaimsProcessingStack(app, 'TestStack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
    }).not.toThrow();
  });

  it('should create stack with different region', () => {
    const app = new cdk.App();
    expect(() => {
      new ClaimsProcessingStack(app, 'TestStackEU', {
        env: {
          account: '123456789012',
          region: 'eu-west-1',
        },
      });
    }).not.toThrow();
  });
});
