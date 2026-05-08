/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';
import { useParentTemplateDefinition } from '../templates_v2/hooks/use_parent_template_definition';
import { mergeTemplateDefinitions } from '../templates_v2/utils/merge_template_definitions';
import { getFieldSnakeKey } from '../../../common/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';

interface UseTemplateFormSyncReturn {
  template: ParsedTemplate | undefined;
  isLoading: boolean;
}

/**
 * Syncs the selected template into the create-case form.
 *
 * - Standard case fields (title, description, tags, severity, category) are
 *   written to the parent form (`@kbn/es-ui-shared-plugin` form_lib).
 * - Extended (template-defined) fields are written to the inner react-hook-form
 *   instance owned by `CreateCaseTemplateFields` and mirrored back to the
 *   parent's `extendedFields` field by that component.
 */
export const useTemplateFormSync = (innerForm: UseFormReturn): UseTemplateFormSyncReturn => {
  const { setFieldValue } = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { data: template, isLoading } = useGetTemplate(templateId || undefined);
  const { definition: parentDefinition, isFetched: parentFetched } = useParentTemplateDefinition(
    template?.definition?.extends
  );
  const appliedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!templateId) {
      if (appliedRef.current) {
        appliedRef.current = undefined;
        setFieldValue('description', '');
        setFieldValue('tags', []);
        setFieldValue('severity', 'low');
        setFieldValue('category', null);

        // Clear all extended-field values from the inner RHF form.
        innerForm.reset({ [CASE_EXTENDED_FIELDS]: {} });
      }
      return;
    }

    if (!template || template.templateId !== templateId) {
      return;
    }

    const { definition } = template;
    const parentId = definition.extends;
    // Wait until the parent query settles (success or error) before applying.
    // parentFetched is false only while the query is in-flight; once it resolves
    // (even as a 404/error), we proceed — possibly without parent fields.
    if (parentId && !parentFetched) {
      return;
    }
    const key = `${template.templateId}:${template.templateVersion}:${parentId ?? ''}:${String(
      parentFetched
    )}`;
    if (appliedRef.current === key) {
      return;
    }
    appliedRef.current = key;
    const fieldMappings: Array<[string, unknown]> = [
      ['title', definition.name],
      ['description', definition.description],
      ['tags', definition.tags?.length ? definition.tags : undefined],
      ['severity', definition.severity],
      ['category', definition.category],
    ];

    for (const [fieldName, value] of fieldMappings) {
      if (value !== undefined) {
        setFieldValue(fieldName, value);
      }
    }

    // Merge parent fields (if `extends` is set) with the template's own fields
    const effectiveDefinition = parentDefinition
      ? mergeTemplateDefinitions(parentDefinition, definition)
      : definition;

    // Apply default values for extended fields into the inner RHF form.
    // Reset wholesale so any previously-applied extended fields from a different
    // template don't linger in the form state.
    const nextExtended: Record<string, string> = {};
    if (effectiveDefinition.fields) {
      for (const field of effectiveDefinition.fields) {
        const fieldKey = getFieldSnakeKey(field.name, field.type);
        nextExtended[fieldKey] = getYamlDefaultAsString(field.metadata?.default);
      }
    }
    innerForm.reset({ [CASE_EXTENDED_FIELDS]: nextExtended });
  }, [templateId, template, parentDefinition, parentFetched, setFieldValue, innerForm]);

  return { template, isLoading };
};
