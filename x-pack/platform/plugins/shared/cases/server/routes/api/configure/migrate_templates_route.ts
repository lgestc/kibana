/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_CONFIGURE_MIGRATE_TEMPLATES_URL } from '../../../../common/constants';
import { MigrateTemplatesRequestRt } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const migrateTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CONFIGURE_MIGRATE_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Migrate legacy case templates to the new templates system',
  },
  handler: async ({ context, request, response }) => {
    try {
      const { owner } = decodeWithExcessOrThrow(MigrateTemplatesRequestRt)(request.body);

      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const result = await casesClient.configure.migrateLegacyTemplates(owner);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to migrate legacy templates: ${error}`,
        error,
      });
    }
  },
});
