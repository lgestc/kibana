/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasePostRequest } from '../../../common';
import type { ConnectorTypeFields } from '../../../common/types/domain';

export type CaseFormFieldsSchemaProps = Omit<
  CasePostRequest,
  'connector' | 'settings' | 'owner' | 'customFields'
> & {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
  syncAlerts: boolean;
  extractObservables: boolean;
  customFields: Record<string, string | boolean>;
  templateId?: string;
  templateVersion?: number;
  extendedFields?: Record<string, unknown>;
};
