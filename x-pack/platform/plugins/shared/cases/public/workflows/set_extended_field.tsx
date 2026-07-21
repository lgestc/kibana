/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { setExtendedFieldStepCommonDefinition } from '../../common/workflows/steps/set_extended_field';
import type { Owner } from '../../common/bundled-types.gen';
import type {
  ApplicableField,
  ApplicableFieldsResponse,
} from '../../common/types/domain/template/applicable_field';
import { CASE_FIELDS_URL } from '../../common/constants';
import { KibanaServices } from '../common/lib/kibana';
import * as i18n from '../../common/workflows/translations';
import { collectSelectionSearchOptions } from './selection_search';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';

const toSelectionOption = (field: ApplicableField): SelectionOption<string> => ({
  value: field.key,
  label: field.label,
  description: field.type,
});

/**
 * Discovery is owner-scoped at authoring time (there is no resolved case/template yet), so it returns
 * the always-valid global fields. Template-only keys remain valid at runtime; the editor just cannot
 * enumerate them until the case/template is resolved. Display-only fields are excluded (not writable).
 */
const getWritableFieldsForOwner = async (owner: Owner): Promise<ApplicableField[]> => {
  const response = await KibanaServices.get().http.fetch<ApplicableFieldsResponse>(
    CASE_FIELDS_URL,
    {
      method: 'GET',
      query: { owner },
    }
  );
  return (response?.fields ?? []).filter((field) => !field.displayOnly);
};

export const setExtendedFieldStepDefinition = createPublicCaseStepDefinition({
  ...setExtendedFieldStepCommonDefinition,
  editorHandlers: {
    input: {
      field_key: {
        selection: {
          dependsOnValues: ['input.owner'],
          search: async (input, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return [];
            }

            const query = input.trim().toLowerCase();
            const fields = await getWritableFieldsForOwner(owner);

            return collectSelectionSearchOptions({
              items: fields,
              hasEmptyQuery: query.length === 0,
              matchesQuery: (field) =>
                field.key.toLowerCase().includes(query) ||
                field.label.toLowerCase().includes(query),
              toOption: (field) => toSelectionOption(field),
            });
          },
          resolve: async (value, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return null;
            }

            const fields = await getWritableFieldsForOwner(owner);
            const field = fields.find((currentField) => currentField.key === value);

            return field ? toSelectionOption(field) : null;
          },
          getDetails: async (value, _context, option) => {
            if (option) {
              return {
                message: i18n.EXTENDED_FIELD_CAN_BE_USED_MESSAGE(option.value),
              };
            }

            return {
              message: i18n.EXTENDED_FIELD_NOT_FOUND_MESSAGE(value),
            };
          },
        },
      },
    },
  },
});
