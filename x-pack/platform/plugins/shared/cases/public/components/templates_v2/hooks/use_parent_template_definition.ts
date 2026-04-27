/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { load as parseYaml } from 'js-yaml';
import type { z } from '@kbn/zod/v4';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useGetTemplates } from './use_get_templates';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

/**
 * Resolves a parent template definition by name from the templates list.
 * Used for single-level `extends` inheritance in template v2.
 *
 * Returns undefined when parentName is not provided, the list is loading,
 * or the parent template cannot be found or parsed.
 */
export const useParentTemplateDefinition = (
  parentName: string | undefined
): ParsedTemplateDefinition | undefined => {
  const { owner } = useCasesContext();

  const { data: templatesData } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner, isEnabled: true },
  });

  return useMemo(() => {
    if (!parentName || !templatesData?.templates) {
      return undefined;
    }

    const parentTemplate = templatesData.templates.find((t) => t.name === parentName);
    if (!parentTemplate) {
      return undefined;
    }

    try {
      // The list endpoint returns templates with `definition` already parsed as an
      // object (the server calls parseTemplate on every list item). Safely handle
      // both the raw-string and pre-parsed-object cases.
      const raw = parentTemplate.definition;
      const parsed = typeof raw === 'string' ? parseYaml(raw) : raw;
      if (!parsed || typeof parsed !== 'object') {
        return undefined;
      }
      const result = ParsedTemplateDefinitionSchema.safeParse(parsed);
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  }, [parentName, templatesData]);
};
