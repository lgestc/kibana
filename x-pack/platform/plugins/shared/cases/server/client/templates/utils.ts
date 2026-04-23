/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { TemplateConfiguration, CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { FieldType } from '../../../common/types/domain/template/fields';

/**
 * Converts a legacy template (stored in cases-configure) into a YAML definition
 * string suitable for the new cases-templates saved object system.
 */
export const buildYamlDefinition = (
  legacyTemplate: TemplateConfiguration,
  configCustomFields: CustomFieldConfiguration[]
): string => {
  const { name, description, tags, caseFields } = legacyTemplate;

  const definition: Record<string, unknown> = { name };

  const resolvedDescription = description ?? caseFields?.description;
  if (resolvedDescription) {
    definition.description = resolvedDescription;
  }

  const resolvedTags = tags?.length ? tags : caseFields?.tags?.length ? caseFields.tags : undefined;
  if (resolvedTags) {
    definition.tags = resolvedTags;
  }

  if (caseFields?.severity) {
    definition.severity = caseFields.severity;
  }

  if (caseFields?.category !== undefined) {
    definition.category = caseFields.category;
  }

  const fields: Array<Record<string, unknown>> = [];

  for (const cf of caseFields?.customFields ?? []) {
    const configCF = configCustomFields.find((c) => c.key === cf.key);
    if (configCF) {
      const field: Record<string, unknown> = {
        name: cf.key,
        label: configCF.label,
      };

      if (cf.type === CustomFieldTypes.TEXT) {
        field.type = 'keyword';
        field.control = FieldType.INPUT_TEXT;
        if (cf.value !== null) {
          field.metadata = { default: cf.value };
        }
      } else if (cf.type === CustomFieldTypes.NUMBER) {
        field.type = 'integer';
        field.control = FieldType.INPUT_NUMBER;
        if (cf.value !== null) {
          field.metadata = { default: cf.value };
        }
      } else if (cf.type === CustomFieldTypes.TOGGLE) {
        field.type = 'keyword';
        field.control = FieldType.SELECT_BASIC;
        field.metadata = {
          options: ['true', 'false'],
          ...(cf.value !== null ? { default: String(cf.value) } : {}),
        };
      }

      fields.push(field);
    }
  }

  definition.fields = fields;

  return yaml.dump(definition, { lineWidth: -1, noRefs: true });
};
