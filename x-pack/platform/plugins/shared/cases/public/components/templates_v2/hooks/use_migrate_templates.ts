/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MigrateTemplatesResponse } from '../../../../common/types/api';
import { migrateTemplatesToV2 } from '../../../containers/configure/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import type { ServerError } from '../../../types';
import { useCasesContext } from '../../cases_context/use_cases_context';

export const useMigrateLegacyTemplates = () => {
  const queryClient = useQueryClient();
  const { owner } = useCasesContext();
  const resolvedOwner = owner[0];

  return useMutation<MigrateTemplatesResponse, ServerError>(
    () => {
      if (!resolvedOwner) {
        return Promise.reject(new Error('No owner available in cases context'));
      }
      return migrateTemplatesToV2({ owner: resolvedOwner });
    },
    {
      mutationKey: casesMutationsKeys.migrateLegacyTemplates,
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.templates);
        queryClient.invalidateQueries(casesQueriesKeys.configuration({}));
      },
    }
  );
};
