/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { wiredStreamDefinitonSchema } from '../streams';
import { inheritedFieldDefinitionSchema, lifecycleSchema } from '../common';

export const wiredReadStreamDefinitonSchema = wiredStreamDefinitonSchema
  .extend({
    inherited_fields: inheritedFieldDefinitionSchema,
    lifecycle: lifecycleSchema,
  })
  .strict();

export type WiredReadStreamDefinition = z.infer<typeof wiredReadStreamDefinitonSchema>;
