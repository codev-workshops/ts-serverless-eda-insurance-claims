// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Document Service Event Constants
 *
 * Defines the event sources and detail types used by the Document Service
 * for publishing events to EventBridge after processing uploaded documents.
 *
 * The Document Service processes two types of documents:
 * - Driver's License: Analyzed using AWS Textract for ID document extraction
 * - Vehicle Photos: Analyzed using Rekognition and external APIs for color/damage detection
 */
export enum DocumentsEvents {
  /** Event source identifier for document processing events */
  SOURCE = "document.service",

  /** Detail type published when a document has been successfully processed */
  DOCUMENT_PROCESSED = "Document.Processed",

  /** Detail type published when document processing fails */
  DOCUMENT_REJECTED = "Document.Rejected",
}
