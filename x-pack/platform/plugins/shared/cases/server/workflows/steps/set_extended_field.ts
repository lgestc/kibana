/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setExtendedFieldStepCommonDefinition,
  type SetExtendedFieldStepInput,
} from '../../../common/workflows/steps/set_extended_field';
import type { CasesClient } from '../../client';
import { SET_EXTENDED_FIELD_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput } from './utils';
import { resolveCaseVersion } from './update_case_helpers';

export const setExtendedFieldStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setExtendedFieldStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (casesClient, input: SetExtendedFieldStepInput) => {
        try {
          const caseVersion = await resolveCaseVersion(casesClient, input.case_id, input.version);

          // Route through the client update path (not a raw SO write) so the `extended_fields`
          // user action is recorded. The server merges the incoming key over existing values.
          await casesClient.cases.bulkUpdate({
            cases: [
              {
                id: input.case_id,
                version: caseVersion,
                extended_fields: { [input.field_key]: input.value },
              },
            ],
          });

          const updatedCase = await casesClient.cases.get({
            id: input.case_id,
            includeComments: false,
          });

          return safeParseCaseForWorkflowOutput(
            setExtendedFieldStepCommonDefinition.outputSchema.shape.case,
            updatedCase
          );
        } catch {
          throw new Error(SET_EXTENDED_FIELD_FAILED_MESSAGE(input.case_id, input.field_key));
        }
      }
    ),
  });
