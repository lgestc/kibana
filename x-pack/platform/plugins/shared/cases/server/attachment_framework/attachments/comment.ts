/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';

export const commentAttachmentType: UnifiedAttachmentTypeSetup = {
  id: COMMENT_ATTACHMENT_TYPE,
  schemaValidator: (data: unknown) => {
    decodeCommentAttachmentData(data);
  },
};

/**
 * Single source of truth for comment attachment data shape.
 * Used by: registry validator (on write) and schema transformer (on read/transform).
 * Define → register & validate → then transform; no data-specific checks in cases main codebase.
 */
export const CommentAttachmentDataSchema = z.object({
  content: z.string(),
});

export type CommentAttachmentData = z.infer<typeof CommentAttachmentDataSchema>;

/**
 * Decodes and validates comment attachment data.
 * Enforces non-empty content. Use this for both registry validation and parsing in the transformer.
 */
export const decodeCommentAttachmentData = (data: unknown): CommentAttachmentData => {
  const validated = decodeWithExcessOrThrowZod(CommentAttachmentDataSchema)(data);

  if (validated.content.trim().length === 0) {
    throw badRequest('Comment content must be a non-empty string');
  }
  if (validated.content.length > MAX_COMMENT_LENGTH) {
    throw badRequest(`Comment content exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`);
  }

  return validated;
};
