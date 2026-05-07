/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { FileAttachmentMetadataSchema } from '../../common/types/domain_zod';
import { FILE_ATTACHMENT_TYPE, LENS_ATTACHMENT_TYPE } from '../../common/constants';

import { decodeWithExcessOrThrowZod } from '../common/runtime_types_zod';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { commentAttachmentType } from '../attachment_framework/attachments';
import { jsonValueSchema } from '../../common/schema_zod';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  persistableStateRegistry: PersistableStateAttachmentTypeRegistry,
  unifiedRegistry: UnifiedAttachmentTypeRegistry
) => {
  externalRefRegistry.register({ id: FILE_ATTACHMENT_TYPE, schemaValidator });
  unifiedRegistry.register({ id: LENS_ATTACHMENT_TYPE, schemaValidator: lensSchemaValidator });
  unifiedRegistry.register(commentAttachmentType);
};

const schemaValidator = (data: unknown): void => {
  const fileMetadata = decodeWithExcessOrThrowZod(FileAttachmentMetadataSchema)(data);

  if (fileMetadata.files.length > 1) {
    throw badRequest('Only a single file can be stored in an attachment');
  }
};

const LensAttachmentDataSchema = z.object({
  state: z.record(z.string(), jsonValueSchema),
});

const lensSchemaValidator = (data: unknown): void => {
  decodeWithExcessOrThrowZod(LensAttachmentDataSchema)(data);
};
