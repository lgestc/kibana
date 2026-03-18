/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import { AttachmentPayloadSchema } from '../../attachment/v1';

export const CommentUserActionPayloadSchema = z.object({ comment: AttachmentPayloadSchema });

export const CommentUserActionPayloadWithoutIdsSchema = CommentUserActionPayloadSchema;

export const CommentUserActionSchema = z.object({
  type: z.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadSchema,
});

export const CommentUserActionWithoutIdsSchema = CommentUserActionSchema;
