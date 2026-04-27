/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
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

export const useTemplateFormSync = (): UseTemplateFormSyncReturn => {
  const { setFieldValue } = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { data: template, isLoading } = useGetTemplate(templateId || undefined);
  const parentDefinition = useParentTemplateDefinition(template?.definition?.extends);
  const appliedRef = useRef<string | undefined>(undefined);
  const appliedFieldsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!templateId) {
      if (appliedRef.current) {
        appliedRef.current = undefined;
        setFieldValue('description', '');
        setFieldValue('tags', []);
        setFieldValue('severity', 'low');
        setFieldValue('category', null);

        // Clear previously applied extended fields
        for (const fieldPath of appliedFieldsRef.current) {
          setFieldValue(fieldPath, '');
        }
        appliedFieldsRef.current = [];
      }
      return;
    }

    if (!template || template.templateId !== templateId) {
      return;
    }

    const { definition } = template;
    const parentName = definition.extends;
    // Include whether parent resolved in the key so we re-apply once parent data loads
    const parentResolved = parentName ? Boolean(parentDefinition) : true;
    const key = `${template.templateId}:${template.templateVersion}:${
      parentName ?? ''
    }:${parentResolved}`;
    if (appliedRef.current === key) {
      return;
    }
    // Don't apply yet if parent is still loading
    if (parentName && !parentResolved) {
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

    // Apply default values for extended fields
    const newAppliedFields: string[] = [];
    if (effectiveDefinition.fields) {
      for (const field of effectiveDefinition.fields) {
        const fieldPath = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(field.name, field.type)}`;
        const defaultValue = getYamlDefaultAsString(field.metadata?.default);
        setFieldValue(fieldPath, defaultValue);
        newAppliedFields.push(fieldPath);
      }
    }
    appliedFieldsRef.current = newAppliedFields;
  }, [templateId, template, parentDefinition, setFieldValue]);

  return { template, isLoading };
};
