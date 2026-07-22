/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { getCaseConfigure } from '../containers/configure/api';
import { createCaseFromTemplateStepCommonDefinition } from '../../common/workflows/steps/create_case_from_template';
import * as i18n from '../../common/workflows/translations';
import { collectSelectionSearchOptions } from './selection_search';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';
import type { Owner } from '../../common/bundled-types.gen';
import type { TemplateListItem } from '../../common/types/api/template/v1';
import type { TemplateConfiguration } from '../../common/types/domain';
import { CASE_TEMPLATES_URL } from '../../common/constants';
import { KibanaServices } from '../common/lib/kibana';

interface MergedTemplate {
  /** The id that will be written to the YAML (`templateId` for v2, `key` for v1). */
  id: string;
  name: string;
  description: string | undefined;
  /** True for legacy v1 configuration templates. */
  isLegacy: boolean;
}

const toMergedV2 = (t: TemplateListItem): MergedTemplate => ({
  id: t.templateId,
  name: t.name,
  description: t.description,
  isLegacy: false,
});

const toMergedV1 = (t: TemplateConfiguration): MergedTemplate => ({
  id: t.key,
  name: t.name,
  description: t.description,
  isLegacy: true,
});

const toSelectionOption = (t: MergedTemplate): SelectionOption<string> => ({
  value: t.id,
  label: t.name,
  description: t.description,
  ...(t.isLegacy ? { deprecated: true } : {}),
});

/** Fetch v2 (YAML library) templates for the given owner via the public route. */
const getV2TemplatesForOwner = async (owner: Owner): Promise<TemplateListItem[]> => {
  const response = await KibanaServices.get().http.fetch<{
    templates: TemplateListItem[];
    page: number;
    perPage: number;
    total: number;
  }>(CASE_TEMPLATES_URL, {
    method: 'GET',
    query: { owner, isEnabled: true, perPage: 100 },
  });
  return response?.templates ?? [];
};

/** Fetch v1 (configuration-level) templates for the given owner. */
const getV1TemplatesForOwner = async (owner: Owner): Promise<TemplateConfiguration[]> => {
  const configurations = (await getCaseConfigure({})) ?? [];
  return configurations
    .filter((configuration) => configuration.owner === owner)
    .flatMap((configuration) => configuration.templates ?? []);
};

/**
 * Build a merged, ordered list of templates: v2 (current) first, v1 (deprecated) last.
 * When `isTemplatesEnabled` is false the v2 fetch is skipped (the public route isn't registered).
 */
const getMergedTemplates = async (
  owner: Owner,
  isTemplatesEnabled: boolean
): Promise<MergedTemplate[]> => {
  const [v2Templates, v1Templates] = await Promise.all([
    isTemplatesEnabled ? getV2TemplatesForOwner(owner) : Promise.resolve([]),
    getV1TemplatesForOwner(owner),
  ]);
  return [...v2Templates.map(toMergedV2), ...v1Templates.map(toMergedV1)];
};

export const createCreateCaseFromTemplateStepDefinition = (isTemplatesEnabled: boolean) =>
  createPublicCaseStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    editorHandlers: {
      input: {
        case_template_id: {
          selection: {
            dependsOnValues: ['input.owner'],
            search: async (input, ctx) => {
              const owner = ctx.values.input.owner;
              if (!isValidOwner(owner)) {
                return [];
              }

              const query = input.trim().toLowerCase();
              const templates = await getMergedTemplates(owner, isTemplatesEnabled);
              const queryIsEmpty = query.length === 0;

              return collectSelectionSearchOptions({
                items: templates,
                hasEmptyQuery: queryIsEmpty,
                matchesQuery: (template) =>
                  template.id.toLowerCase().includes(query) ||
                  template.name.toLowerCase().includes(query),
                toOption: (template) => toSelectionOption(template),
              });
            },
            resolve: async (value, ctx) => {
              const owner = ctx.values.input.owner;
              if (!isValidOwner(owner)) {
                return null;
              }
              const templates = await getMergedTemplates(owner, isTemplatesEnabled);
              const template = templates.find((t) => t.id === value);
              if (!template) {
                return null;
              }
              return toSelectionOption(template);
            },
            getDetails: async (value, _context, option) => {
              if (option) {
                return {
                  message: i18n.TEMPLATE_CAN_BE_USED_MESSAGE(option.value),
                };
              }

              return {
                message: i18n.TEMPLATE_NOT_FOUND_MESSAGE(value),
              };
            },
          },
        },
      },
    },
  });
