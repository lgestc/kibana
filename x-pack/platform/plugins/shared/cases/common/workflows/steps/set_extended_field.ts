/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { Owner } from '../../bundled-types.gen';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import * as i18n from '../translations';

export const SetExtendedFieldStepTypeId = 'cases.setExtendedField';

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  owner: Owner,
  // The extended-field storage key, e.g. `priority_as_keyword`. Discover valid keys via the
  // "Get fields applicable to a case" API. Extended-field values are always strings.
  field_key: z.string().min(1, 'field_key is required'),
  value: z.string(),
});

export const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetExtendedFieldStepInputSchema = typeof InputSchema;
type SetExtendedFieldStepOutputSchema = typeof OutputSchema;

export type SetExtendedFieldStepInput = z.infer<typeof InputSchema>;

export const setExtendedFieldStepCommonDefinition: CommonStepDefinition<
  SetExtendedFieldStepInputSchema,
  SetExtendedFieldStepOutputSchema
> = {
  id: SetExtendedFieldStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SET_EXTENDED_FIELD_STEP_LABEL,
  description: i18n.SET_EXTENDED_FIELD_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_EXTENDED_FIELD_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set extended field
\`\`\`yaml
- name: set_extended_field
  type: ${SetExtendedFieldStepTypeId}
  with:
    case_id: "abc-123-def-456"
    owner: "securitySolution"
    field_key: "priority_as_keyword"
    value: "high"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
