/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import { INTERNAL_CONFIGURE_MIGRATE_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import type {
  TemplateConfiguration,
  CustomFieldConfiguration,
} from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain/custom_field/v1';
import { FieldType } from '../../../../common/types/domain/template/fields';

function buildYamlDefinition(
  legacyTemplate: TemplateConfiguration,
  configCustomFields: CustomFieldConfiguration[]
): string {
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
}

/**
 * POST /internal/cases/configure/_migrate_templates
 *
 * Migrates legacy templates (stored in cases-configure) to the new cases-templates saved objects.
 * Legacy templates are preserved for rollback. Sets legacyTemplatesMigrated=true on the config
 * to suppress the migration banner after completion.
 */
export const migrateTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CONFIGURE_MIGRATE_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Migrate legacy case templates to the new templates system',
  },
  handler: async ({ context, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const configurations = await casesClient.configure.get();

      if (!configurations.length) {
        return response.ok({ body: { created: 0, failed: [] } });
      }

      const config = configurations[0];

      if (!config.templates?.length || config.legacyTemplatesMigrated) {
        return response.ok({ body: { created: 0, failed: [] } });
      }

      let created = 0;
      const failed: Array<{ name: string; error: string }> = [];

      for (const legacyTemplate of config.templates) {
        try {
          const definition = buildYamlDefinition(legacyTemplate, config.customFields ?? []);

          await casesClient.templates.createTemplate({
            owner: config.owner,
            definition,
            ...(legacyTemplate.description ? { description: legacyTemplate.description } : {}),
            ...(legacyTemplate.tags?.length ? { tags: legacyTemplate.tags } : {}),
            isEnabled: true,
          });

          created++;
        } catch (err) {
          failed.push({
            name: legacyTemplate.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (created > 0) {
        await casesClient.configure.update(config.id, {
          version: config.version,
          templates: config.templates,
          customFields: config.customFields,
          legacyTemplatesMigrated: true,
        });
      }

      return response.ok({ body: { created, failed } });
    } catch (error) {
      throw createCaseError({
        message: `Failed to migrate legacy templates: ${error}`,
        error,
      });
    }
  },
});
