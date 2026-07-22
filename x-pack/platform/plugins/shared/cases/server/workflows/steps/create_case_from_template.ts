/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  createCaseFromTemplateStepCommonDefinition,
  type CreateCaseFromTemplateStepConfig,
  type CreateCaseFromTemplateStepInput,
  type CreateCaseFromTemplateStepOutput,
} from '../../../common/workflows/steps/create_case_from_template';
import type {
  CaseSeverity,
  Configurations,
  TemplateConfiguration,
} from '../../../common/types/domain';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { CasesClient } from '../../client';
import {
  buildExtendedFieldsFromTemplate,
  parseTemplateDefinition,
} from '../../connectors/cases/v2_template_utils';
import {
  createCasesStepHandler,
  normalizeCaseStepUpdatesForBulkPatch,
  safeParseCaseForWorkflowOutput,
} from './utils';
import {
  getInitialCaseValue,
  type GetInitialCaseValueArgs,
} from '../../../common/utils/get_initial_case_value';

const findTemplateById = (
  configurations: Configurations,
  templateId: string
): TemplateConfiguration | undefined => {
  return configurations
    .flatMap((configuration) => configuration.templates ?? [])
    .find((template) => template.key === templateId);
};

/**
 * v2 path: apply the already-fetched YAML template SO's case-level fields and write its resolved
 * field defaults to `extended_fields`. Mirrors how the Cases connector applies a v2 template.
 */
const createCaseFromV2Template = async (
  casesClient: CasesClient,
  owner: string,
  so: Awaited<ReturnType<CasesClient['templates']['getTemplate']>> & object,
  normalizedOverwrites: Record<string, unknown>
) => {
  const definition = parseTemplateDefinition(so.attributes.definition);
  if (!definition) {
    throw new Error(`Case template "${so.attributes.templateId}" has an invalid definition`);
  }

  const extendedFields = await buildExtendedFieldsFromTemplate(casesClient, definition, owner);

  const mergedCreatePayload = getInitialCaseValue({
    owner,
    // The v2 definition carries no case title; fall back to the template name so the case always
    // has a non-empty title. Callers can override via `overwrites.title`.
    title: definition.name,
    ...(definition.description != null ? { description: definition.description } : {}),
    ...(definition.tags != null ? { tags: definition.tags } : {}),
    ...(definition.severity != null ? { severity: definition.severity as CaseSeverity } : {}),
    ...(definition.category != null ? { category: definition.category } : {}),
    ...(definition.settings != null ? { settings: definition.settings } : {}),
    ...normalizedOverwrites,
  } as GetInitialCaseValueArgs);

  return casesClient.cases.create({
    ...mergedCreatePayload,
    template: { id: so.attributes.templateId, version: so.attributes.templateVersion },
    ...(Object.keys(extendedFields).length > 0 ? { [CASE_EXTENDED_FIELDS]: extendedFields } : {}),
  });
};

export const createCaseFromTemplateStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    handler: createCasesStepHandler<
      CreateCaseFromTemplateStepInput,
      CreateCaseFromTemplateStepConfig,
      CreateCaseFromTemplateStepOutput['case']
    >(getCasesClient, async (casesClient, input) => {
      const { case_template_id, owner, overwrites } = input;

      const normalizedOverwrites = overwrites
        ? normalizeCaseStepUpdatesForBulkPatch(overwrites)
        : {};

      // Try the v2 (YAML library) templates first — getTemplate returns undefined for an unknown id,
      // so the fallback to v1 is clean. Guard with optional access in case the templates feature is
      // disabled, in which case casesClient.templates is unavailable.
      const v2So = await casesClient.templates?.getTemplate(case_template_id);
      if (v2So != null) {
        if (v2So.attributes.owner !== owner) {
          throw new Error(`Case template not found for owner "${owner}": ${case_template_id}`);
        }
        const createdFromV2 = await createCaseFromV2Template(
          casesClient,
          owner,
          v2So,
          normalizedOverwrites
        );
        return safeParseCaseForWorkflowOutput(
          createCaseFromTemplateStepCommonDefinition.outputSchema.shape.case,
          createdFromV2
        );
      }

      // Fall back to v1 (configuration-level) templates.
      const configurations = await casesClient.configure.get({ owner });
      const template = findTemplateById(configurations, case_template_id);

      if (!template) {
        throw new Error(`Case template not found for owner "${owner}": ${case_template_id}`);
      }

      const mergedCreatePayload = getInitialCaseValue({
        owner,
        ...(template.caseFields ?? {}),
        ...normalizedOverwrites,
      } as GetInitialCaseValueArgs);

      const createdCase = await casesClient.cases.create(mergedCreatePayload);
      return safeParseCaseForWorkflowOutput(
        createCaseFromTemplateStepCommonDefinition.outputSchema.shape.case,
        createdCase
      );
    }),
  });
