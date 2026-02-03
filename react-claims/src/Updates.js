// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Real-time Updates Component
 *
 * This module provides real-time event notifications from the backend services
 * to the frontend using AWS IoT Core over WebSocket (MQTT). It displays a
 * vertical timeline of events as they occur during claims processing.
 *
 * Architecture:
 * - Subscribes to user-specific IoT topics using Cognito Identity ID
 * - Receives events published by the Notifications Lambda function
 * - Displays events in a visual timeline with success/error indicators
 *
 * Event Types Handled:
 * - Customer.Accepted / Customer.Rejected - Registration status
 * - Document.Processed - Document analysis results
 * - Claim.Accepted / Claim.Rejected - Claim validation status
 * - Fraud.Detected / Fraud.Not.Detected - Fraud detection results
 * - Settlement.Finalized - Settlement calculation complete
 * - Vendor.Finalized - Rental car vendor assignment
 */

import React from "react";
import { Button, Flex, ScrollView, Heading } from "@aws-amplify/ui-react";
import { PubSub, Auth, API, Amplify } from "aws-amplify";
import { AWSIoTProvider } from "@aws-amplify/pubsub";
import awsmobile from "./aws-exports";
import { getEndpointUrl } from "./utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import "./App.css"

/**
 * UpdateArea Component
 *
 * Displays real-time event notifications from backend services in a scrollable
 * timeline view. Automatically advances the wizard when certain events are received.
 */
class UpdateArea extends React.Component {
  updateParent;

  /**
   * Initializes the component state and binds event handlers.
   *
   * @param {Object} props - Component props
   * @param {Function} props.updateState - Callback to update parent App state
   */
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
    };

    this.updateParent = props.updateState;
    this.componentDidMount = this.componentDidMount.bind(this);
    this.updateMessages = this.updateMessages.bind(this);
    this.resetMessages = this.resetMessages.bind(this);
  }

  /**
   * Clears all messages from the timeline display.
   */
  async resetMessages() {
    this.setState({
      messages: [],
    });
  }

  /**
   * Processes incoming IoT messages and updates application state.
   *
   * Handles different event types to advance the wizard, update S3 URLs
   * for document uploads, and trigger registration completion.
   *
   * @param {Object} data - IoT message data containing event details
   */
  async updateMessages(data) {
    let messages = this.state.messages;
    messages.push(data.value);
    this.setState({
      messages: messages,
    });

    const respData = data.value.detail;

    if (data.value["detail-type"] === "Fraud.Not.Detected" || data.value["detail-type"] === "Claim.Accepted") {
      this.updateParent("nextStep", true);
    }
    
    if (data.value["detail-type"] === "Customer.Accepted") {
      this.updateParent("nextStep", true);
      if (respData.driversLicenseImageUrl) {
        this.updateParent(
          "driversLicenseImageUrl",
          respData.driversLicenseImageUrl
        );
      }
      if (respData.carImageUrl) {
        this.updateParent("carImageUrl", respData.carImageUrl);
      }
    } else if (respData.uploadCarDamageUrl) {
      this.updateParent("uploadCarDamageUrl", respData.uploadCarDamageUrl);
    } else {
      this.updateParent("completedReg", true);
    }
  }

  /**
   * Sets up the IoT subscription when the component mounts.
   */
  async componentDidMount() {
    createSubscription(this.updateMessages);
  }

  render() {
    if (this.state.messages.length === 0) {
      return;
    }

    return (
      <div>
        <Flex
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          alignContent="flex-start"
          gap="1rem"
          >

          <Flex
            width="100"
            direction="row" 
            justifyContent="center"
            alignItems="stretch"
            alignContent="center"
            wrap="nowrap"
            gap="5rem">
              <Button onClick={this.resetMessages}>Clear</Button>                
              <Heading width='100%' level={4}>
                Events received from backend services asynchronously
              </Heading>
          </Flex>

          <ScrollView width="100%" height="700px">
            <Notifications messages={this.state.messages}></Notifications>
          </ScrollView>
        </Flex>
      </div>
    );
  }
}

export default UpdateArea;

/**
 * Creates an IoT Core subscription for real-time event notifications.
 *
 * Configures the AWS IoT Provider with the user's Cognito credentials and
 * subscribes to their identity-specific topic. Handles connection errors
 * by retrying with updated IoT policy attachment.
 *
 * @param {Function} nextFunc - Callback function to handle incoming messages
 * @param {boolean} isRetry - Whether this is a retry attempt after error
 */
function createSubscription(nextFunc, isRetry) {
  var pubSubEndpoint = getEndpointUrl("iotendpointaddress");

  Auth.currentCredentials().then(async (res) => {
    PubSub.removePluggable("AWSIoTProvider");
    Amplify.addPluggable(
      new AWSIoTProvider({
        aws_pubsub_region: awsmobile.aws_project_region,
        aws_pubsub_endpoint: `wss://${pubSubEndpoint}/mqtt`,
      })
    );

    await updateCustomer();

    PubSub.subscribe(res.identityId).subscribe({
      next: async (data) => {
        await nextFunc(data);
      },
      error: async (error) => {
        if (error.error.errorCode === 8 && !isRetry) {
          await updateCustomer();
          createSubscription(nextFunc, true);
        } else {
          console.error(error);
        }
      },
      complete: () => {},
    });
  });
}

/**
 * Attaches the IoT policy to the current user's Cognito identity.
 *
 * Calls the IOT API to ensure the user has the necessary permissions
 * to subscribe to their IoT topic for receiving notifications.
 *
 * @returns {Promise<Object>} API response
 */
async function updateCustomer() {
  const apiName = "IOTApi";
  const path = "iotPolicy";
  const myInit = {
    body: {},
    headers: {},
  };

  const resp = await API.put(apiName, path, myInit);
  return resp;
}

/**
 * Notifications Component
 *
 * Renders a vertical timeline of event notifications with visual indicators
 * for success (blue) and error (red) states. Automatically scrolls to show
 * the latest messages.
 */
class Notifications extends React.Component {
  messagesEndRef = React.createRef();

  componentDidMount () {
    this.scrollToBottom()
  }
  componentDidUpdate () {
    this.scrollToBottom()
  }
  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  constructor(props) {
    super(props);
    this.state = { messages: props.messages ? props.messages : [] };
    this.onChange = props.onChange;
  }

  static getDerivedStateFromProps(props, state) {
    return {
      messages: props.messages,
    };
  }

  /**
   * Extracts human-readable information from successful event messages.
   *
   * @param {Object} message - EventBridge event message
   * @returns {string} Formatted information string for display
   */
  extractInformation(message) {
    const detailType = message["detail-type"];
    const detail = message.detail;

    let information = "";

    function documentInformation(detail) {
      let docInfo = "";

      if (detail.documentType === 'CAR') {
        docInfo = `Car detected with Color: ${detail.analyzedFieldAndValues.color.Name}`;

        if (detail.analyzedFieldAndValues.type === "claims") {
          docInfo += ` Damage: ${detail.analyzedFieldAndValues.damage.Name}`;
        }
      }

      if (detail.documentType === 'DRIVERS_LICENSE') {
        docInfo = "Driver's License processed successfully";
      }

      return docInfo;
    }

    switch (detailType) {
      case "Document.Processed":
        information = documentInformation(detail);
        break;
      case "Settlement.Finalized":
        information = detail.settlementMessage;
        break;
      case "Vendor.Finalized":
        information = detail.vendorMessage;
        break;                
      default:
        break;
    }

    return information;
  }

  /**
   * Extracts error messages from failed event messages.
   *
   * @param {Object} message - EventBridge event message
   * @returns {string} Error message for display
   */
  extractErrorMessage(message) {
    const detailType = message["detail-type"];
    const detail = message.detail;

    let errorMessage = "";

    switch (detailType) {
      case "Fraud.Detected":
        errorMessage = detail.fraudReason;
        break;
      case "Customer.Rejected":
        errorMessage = detail.message;
        break;
      case "Claim.Rejected":
        errorMessage = detail.message;
        break;                
      default:
        break;
    }

    return errorMessage;
  }

  render() {
    let texts = [];
    const messages = this.state.messages;
    let i = 0;

    if (messages && messages.length > 0) {
      messages.forEach((message) => {
        let iconStyleValue, contentStyleValue, iconValue, contentArrowStyleValue, errorMessage, information;

        if(
          (message["detail-type"].endsWith(".Detected") && !message["detail-type"].endsWith("Not.Detected")) || 
          message["detail-type"].endsWith(".Rejected")
        ) {
          iconStyleValue = { background: 'rgb(233, 30, 99)', color: '#fff' };
          contentStyleValue = { background: 'rgb(233, 30, 99)', color: '#fff' };
          contentArrowStyleValue = { borderRight: '7px solid  rgb(233, 30, 99)' };
          errorMessage = this.extractErrorMessage(message);
          iconValue = <FontAwesomeIcon icon={faXmark} />;
        } else {
          iconStyleValue = { background: 'rgb(33, 150, 243)', color: '#fff' };
          contentStyleValue = { background: 'rgb(33, 150, 243)', color: '#fff' };
          contentArrowStyleValue = { borderRight: '7px solid  rgb(33, 150, 243)' };
          information = this.extractInformation(message);
          iconValue = <FontAwesomeIcon icon={faCheck} />;
        }

        const date = new Date(message.time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        const time = new Date(message.time).toLocaleTimeString('en-US', { 
          hour: "2-digit", 
          minute: "2-digit" 
        });
        const dateTime = `${date} ${time}`;

        texts.push(
          <VerticalTimelineElement
            key={++i}
            visible={true}
            className="vertical-timeline-element"
            contentStyle={contentStyleValue}
            contentArrowStyle={contentArrowStyleValue}
            date={dateTime}
            dateClassName="timeline-date-time"
            iconStyle={iconStyleValue}
            icon={iconValue}
          >
            <h3 className="vertical-timeline-element-title">{message["detail-type"]}</h3>
            <h6 className="vertical-timeline-element-subtitle">{message.detail.customerId}</h6>
            <p>{errorMessage}</p>
            <p>{information}</p>
          </VerticalTimelineElement>
        );
      });
    }

    return (
      <VerticalTimeline lineColor="blue">
        {texts}
        <div ref={this.messagesEndRef} />
      </VerticalTimeline>
    );
  }
}
