// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Insurance Claims Processing Frontend Application
 *
 * This React application provides the user interface for the serverless event-driven
 * insurance claims processing system. It guides users through a multi-step wizard
 * for customer registration, document upload, and claim submission.
 *
 * Application Flow:
 * 1. Customer Registration (SignupForm) - Collect personal and policy information
 * 2. Driver's License Upload (UploadFile) - Upload ID document for verification
 * 3. Vehicle Image Upload (UploadFile) - Upload vehicle photo for policy
 * 4. Claim Submission (ClaimForm) - Submit First Notice of Loss (FNOL)
 * 5. Damaged Vehicle Upload (UploadFile) - Upload damage photos for claims
 * 6. Completion - Claim submitted successfully
 *
 * Real-time Updates:
 * The UpdateArea component subscribes to AWS IoT Core topics to receive real-time
 * notifications about processing status (customer acceptance, fraud detection,
 * settlement finalization, etc.)
 *
 * Authentication:
 * Uses AWS Amplify with Cognito for user authentication. The withAuthenticator
 * HOC wraps the app to require sign-in before access.
 */

import SignupForm from "./Signup";
import UpdateArea from "./Updates";
import UploadFile from "./UploadFile";
import React from "react";
import ClaimForm from "./Claim";
import { API, Auth } from "aws-amplify";
import StepWizard from "react-step-wizard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faNewspaper, faRightFromBracket, faCarBurst } from '@fortawesome/free-solid-svg-icons';
import {
  Divider,
  Grid,
  Link,
  Card,
  Button,
  Flex,
  Heading,
  withAuthenticator
} from "@aws-amplify/ui-react";

import dl_AZ from "./DL/dl_AZ.jpg";
import dl_MA from "./DL/dl_MA.jpg";
import dl_OH from "./DL/dl_OH.jpg";
import damaged_car_1 from "./Vehicles/damaged_car_1.jpeg";
import damaged_car_2 from "./Vehicles/damaged_car_2.jpeg";
import red_car from "./Vehicles/red_car.jpg";
import green_car from "./Vehicles/green_car.jpg";

/**
 * Main Application Component
 *
 * Orchestrates the multi-step claims processing wizard and manages application state.
 * Uses react-step-wizard for navigation between registration, document upload,
 * and claim submission steps.
 */
class App extends React.Component {
  /**
   * Initializes the application state and binds event handlers.
   *
   * @param {Object} props - React component props
   */
  constructor(props) {
    super(props);
    this.state = { uploadDL: false, displayClaimForm: false, key: 1, stepCompleted: 1, btnVisibility: "none" };
    this.updateState = this.updateState.bind(this);
    this.checkBtnVisibility = this.checkBtnVisibility.bind(this);

    this.wizard = null;

    this.setWizardRef = (element) => {
      this.wizard = element;
    }
  }

  /**
   * Updates application state and handles step progression.
   *
   * When registration is completed, fetches customer data from the API.
   * When nextStep is triggered, advances the wizard to the next step.
   *
   * @param {string} key - State key to update
   * @param {any} value - New value for the state key
   */
  async updateState(key, value) {
    this.setState({ [key]: value });
    if (key === "completedReg" && value === true) {
      const customer = await this.getCustomer();
      this.setState({ customer: customer });
    }
    if (key === "nextStep" && value === true) {
      this.setState({
        ...this.state,
        stepCompleted: this.state.stepCompleted + 1
      });
      this.wizard.nextStep();
    }
  }

  /**
   * Fetches customer data from the Customer API.
   *
   * Retrieves the current user's customer profile and associated policies
   * using AWS Amplify API with IAM authentication.
   *
   * @returns {Promise<Object>} Customer data including policies
   */
  getCustomer() {
    return new Promise((resolve, reject) => {
      const apiName = "CustomerApi";
      const path = "customer";
      const myInit = {
        headers: {},
      };
      API.get(apiName, path, myInit)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Signs out the current user using AWS Amplify Auth.
   */
  signOut() {
    Auth.signOut();
  }

  /**
   * Controls the visibility of the Next button based on wizard progress.
   *
   * Shows the Next button only if the user has already completed the current step,
   * allowing them to navigate forward through previously completed steps.
   */
  checkBtnVisibility() {
    if (this.wizard.currentStep < this.state.stepCompleted) {
      this.setState({ btnVisibility: "block" });
    } else {
      this.setState({ btnVisibility: "none" });
    }
  }

  render() {
    return (
      <>
        <Grid
          columnGap="0.25rem"
          rowGap="1rem"
          templateColumns="55% 0% 45%"
          templateRows="1fr"
        >
          <Card columnStart="1" columnEnd="-1" backgroundColor='hsl(130, 33%, 37%)'>
            <Flex width="100%" alignItems="center" alignContent="center">
              <Heading width='80%' level={3} color='hsl(130, 60%, 95%)'>
                <Flex><FontAwesomeIcon icon={faCarBurst} size="lg" />Insurance claim form</Flex>
              </Heading>
              <Link color='hsl(130, 60%, 95%)' href="https://github.com/aws-samples/serverless-eda-insurance-claims-processing/" target="_blank">
                <Flex><FontAwesomeIcon icon={faGithub} size="lg" />GitHub</Flex>
              </Link>
              <Link color='hsl(130, 60%, 95%)' href="https://github.com/aws-samples/serverless-eda-insurance-claims-processing#blogs" target="_blank">
                <Flex><FontAwesomeIcon icon={faNewspaper} size="lg" />Blogs</Flex>
              </Link>
              <Button backgroundColor="lightgrey" color="black" onClick={this.signOut}>
                <Flex alignItems="center">
                  <FontAwesomeIcon icon={faRightFromBracket} size="lg" />Sign Out
                </Flex>
              </Button>
            </Flex>
          </Card>

          <Card columnStart="1" columnEnd="1" key={this.state.key}>
            <StepWizard
              ref={this.setWizardRef}
              onStepChange={this.checkBtnVisibility}>
              <>
                <SignupForm
                  updateState={this.updateState}
                  getCustomer={this.getCustomer}
                  completedReg={this.state.completedReg} />
                <br />
                <Flex>
                  <Button display={this.state.btnVisibility} variation="secondary" onClick={() => this.wizard.nextStep()}>Next</Button>
                </Flex>
              </>

              <>
                <UploadFile
                  updateState={this.updateState}
                  s3URL={this.state.driversLicenseImageUrl}
                  images={[{ path: dl_AZ }, { path: dl_MA }, { path: dl_OH }]}
                  title="Upload Drivers License"
                />
                <br />
                <Flex>
                  <Button variation="secondary" onClick={() => this.wizard.previousStep()}>Previous</Button>
                  <Button display={this.state.btnVisibility} variation="secondary" onClick={() => this.wizard.nextStep()}>Next</Button>
                </Flex>
              </>

              <>
                <UploadFile
                  s3URL={this.state.carImageUrl}
                  images={[{ path: red_car }, { path: green_car }]}
                  title="Upload Vehicle Image"
                />
                <br />
                <Flex>
                  <Button variation="secondary" onClick={() => this.wizard.previousStep()}>Previous</Button>
                  <Button display={this.state.btnVisibility} variation="secondary" onClick={() => this.wizard.nextStep()}>Next</Button>
                </Flex>
              </>

              <>
                <ClaimForm
                  customer={this.state.customer}
                />
                <br />
                <Flex>
                  <Button variation="secondary" onClick={() => this.wizard.previousStep()}>Previous</Button>
                  <Button display={this.state.btnVisibility} variation="secondary" onClick={() => this.wizard.nextStep()}>Next</Button>
                </Flex>
              </>

              <>
                <UploadFile
                  updateState={this.updateState}
                  s3URL={this.state.uploadCarDamageUrl}
                  images={[
                    { path: damaged_car_1 },
                    { path: damaged_car_2 },
                    { path: red_car },
                  ]}
                  title="Upload Vehicle Image"
                />
                <br />
                <Flex>
                  <Button variation="secondary" onClick={() => this.wizard.previousStep()}>Previous</Button>
                  <Button display={this.state.btnVisibility} variation="secondary" onClick={() => this.wizard.nextStep()}>Next</Button>
                </Flex>
              </>
              <>
                <h1>Claim Submitted!</h1>
                <Button variation="secondary" onClick={() => {
                  this.wizard.firstStep();
                  this.setState({ stepCompleted: 1, btnVisibility: "none" })
                }}>Start again</Button>
              </>
            </StepWizard>
          </Card>

          <Card columnStart="2" columnEnd="-1" >
            <UpdateArea updateState={this.updateState}/>
          </Card>
          <Divider orientation="vertical" />

        </Grid>
      </>
    );
  }
}

export default withAuthenticator(App);
