// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * File Upload Component
 *
 * This component handles document and image uploads to S3 using pre-signed URLs.
 * It is used throughout the claims workflow for uploading:
 * - Driver's license images (for identity verification)
 * - Vehicle images (for policy registration)
 * - Damaged vehicle photos (for claims processing)
 *
 * The component displays a gallery of sample images that users can select
 * and upload. In a production environment, this would be replaced with
 * actual file selection from the user's device.
 *
 * Upload Flow:
 * 1. User selects an image from the gallery
 * 2. User clicks Upload button
 * 3. Image is uploaded to S3 via pre-signed URL
 * 4. S3 event triggers document processing (Textract, Rekognition)
 */

import React from "react";
import { Flex, Button, Text, Image } from "@aws-amplify/ui-react";
import axios from "axios";

/**
 * UploadFile Component
 *
 * Displays a gallery of images and handles upload to S3 via pre-signed URLs.
 */
class UploadFile extends React.Component {

  /**
   * Initializes the upload component with image gallery and state.
   *
   * @param {Object} props - Component props
   * @param {Array} props.images - Array of image objects with path property
   * @param {string} props.title - Title to display above the gallery
   * @param {string} props.s3URL - Pre-signed S3 URL for upload
   * @param {Function} props.updateState - Callback to update parent state
   */
  constructor(props) {
    super(props);

    this.state = {
      message: "Updates will go here.",
      readyToUpload: true,
      statusMessage: "",
      display: props.display,
      images: props.images,
      title: props.title,
    };

    this.uploadToS3 = this.uploadToS3.bind(this);
    this.selectImage = this.selectImage.bind(this);
    this.updateParent = props.updateState;
  }

 
  static getDerivedStateFromProps(props, state) {
    return {
      s3url: props.s3URL,
      display: props.display,
    };
  }

  /**
   * Handles image selection from the gallery.
   *
   * Toggles selection state for the clicked image and deselects others.
   *
   * @param {Event} event - Click event with image index
   */
  selectImage(event) {
    const index = parseInt(event.target.attributes.index.nodeValue);
    let images = this.state.images;
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (i === index) {
        image.selected = !image.selected;
      } else {
        image.selected = false;
      }
    }
    this.setState({
      images: images,
      selectedImgIndx: index,
      readyToUpload: true,
      statusMessage: "",
    });
  }

  /**
   * Uploads the selected image to S3 using the pre-signed URL.
   *
   * Fetches the image as a blob and uploads it via PUT request.
   * Updates status message and notifies parent component on success.
   */
  async uploadToS3() {
    if (this.state.selectedImgIndx !== undefined) {
      const image = this.state.images[this.state.selectedImgIndx];

      try{
        const imgRes = await fetch(image.path);
        const imgBlog = await imgRes.blob();

        const uploadImg = await axios.put(this.state.s3url, imgBlog);

        if(uploadImg.statusText === "OK"){
          this.setState({
            readyToUpload: false,
            selectedFile: undefined,
            statusMessage: "File uploaded successfully.",
          });
          if(this.updateParent)
            this.updateParent("imgUploaded", true)
        }
      } catch(err) {
        console.error(err);
      }
  
    }
  }

  render() {
    return (
      <div>
        <br></br>
        <Flex
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          alignContent="flex-start"
          wrap="nowrap"
          gap="1rem"
          display={this.state.display}
        >
          <Text fontWeight="bold">{this.state.title}</Text>
          <Flex direction="row" wrap="wrap">
            <ImageOptions
              images={this.state.images}
              selectImage={this.selectImage}
            />
          </Flex>
          <Flex direction="row">
          <Button
            variation="primary"
            onClick={this.uploadToS3}
            isDisabled={!this.state.readyToUpload}
          >
            Upload
          </Button>
          </Flex>
          <Text>{this.state.statusMessage}</Text>
        </Flex>
      </div>
    );
  }
}

/**
 * ImageOptions Component
 *
 * Renders a gallery of selectable images with visual selection indicator.
 * Selected images are highlighted with a border.
 */
class ImageOptions extends React.Component {
  selectImage;

  /**
   * Initializes the image gallery component.
   *
   * @param {Object} props - Component props
   * @param {Array} props.images - Array of image objects
   * @param {Function} props.selectImage - Selection handler callback
   */
  constructor(props) {
    super(props);
    this.state = { images: props.images ? props.images : [] };
    this.selectImage = props.selectImage;
  }

  render() {
    let imageComponents = [];
    const images = this.state.images;
    let i = 0;
    if (images && images.length > 0) {
      images.forEach((image) => {
        imageComponents.push(
          <Image
            index={i}
            key={i}
            alt={image.path}
            src={image.path}
            backgroundColor="initial"
            height="25%"
            width="25%"
            opacity="100%"
            border={image.selected ? "5px solid #555" : ""}
            onClick={this.selectImage}
          />
        );
        i++;
      });
    }
    return imageComponents;
  }
}

export default UploadFile;
