/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FormProvider,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from './evaluate_conditions';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getYamlDefaultAsString } from '../utils';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  owner: string;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}

export const FieldsRenderer: FC<{
  resolvedFields: InlineField[];
  form: FormHook<{}>;
}> = ({ resolvedFields, form }) => {
  const fieldTypeMap = useMemo(
    () => Object.fromEntries(resolvedFields.map((f) => [f.name, f.type])),
    [resolvedFields]
  );

  const fieldControlMap = useMemo(
    () => Object.fromEntries(resolvedFields.map((f) => [f.name, f.control])),
    [resolvedFields]
  );

  const allFieldPaths = useMemo(
    () => resolvedFields.map((f) => `${CASE_EXTENDED_FIELDS}.${f.name}_as_${f.type}`),
    [resolvedFields]
  );

  const [formData] = useFormData({ form, watch: allFieldPaths });

  const fieldValues = useMemo(() => {
    const extendedFields =
      (formData as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    return Object.fromEntries(
      resolvedFields.map((f) => [f.name, extendedFields[`${f.name}_as_${f.type}`]])
    );
  }, [formData, resolvedFields]);

  return (
    <>
      {resolvedFields.map((field) => {
        if (field.display?.show_when) {
          const shouldShow = evaluateCondition(
            field.display.show_when,
            fieldValues,
            fieldTypeMap,
            fieldControlMap
          );
          if (!shouldShow) return null;
        }

        const isRequired =
          field.validation?.required === true ||
          (field.validation?.required_when
            ? evaluateCondition(
                field.validation.required_when,
                fieldValues,
                fieldTypeMap,
                fieldControlMap
              )
            : false);

        const Control = controlRegistry[field.control] as unknown as FC<Record<string, unknown>>;
        if (!Control) return null;

        const controlProps = {
          ...field,
          label: field.label ?? field.name,
          value: fieldValues[field.name],
          isRequired,
          patternValidation: field.validation?.pattern,
          min: field.validation?.min,
          max: field.validation?.max,
          minLength: field.validation?.min_length,
          maxLength: field.validation?.max_length,
        };

        return (
          <div key={field.name} data-test-subj={`template-field-${field.name}`}>
            <Control {...controlProps} />
          </div>
        );
      })}
    </>
  );
};

FieldsRenderer.displayName = 'FieldsRenderer';

/**
 * WARN: this component uses shared-form renderer for Case form compatiblity.
 * Dont change this until we migrate everything to react hook form.
 */
export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  owner,
  onFieldDefaultChange,
}) => {
  const { resolvedFields, isLoading } = useResolvedFields(parsedTemplate.fields, owner);

  // Content-based key to detect real field definition changes (vs same-content re-parses).
  const fieldsKey = resolvedFields.map((f) => JSON.stringify(f)).join('|');

  // Stabilize the fields reference so useYamlFormSync's effect only fires when
  // field definitions actually change, not on every re-parse that produces a new array object.
  const stableFieldsRef = React.useRef(resolvedFields);
  const prevKeyRef = React.useRef(fieldsKey);
  if (prevKeyRef.current !== fieldsKey) {
    prevKeyRef.current = fieldsKey;
    stableFieldsRef.current = resolvedFields;
  }
  const stableFields = stableFieldsRef.current;

  const initialDefaultValues = React.useMemo(() => {
    const defaults: Record<string, Record<string, string>> = {
      [CASE_EXTENDED_FIELDS]: {},
    };
    for (const field of stableFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = `${field.name}_as_${field.type}`;
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
    return defaults;
  }, [stableFields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  useYamlFormSync(form, stableFields, onFieldDefaultChange);

  if (isLoading) return null;

  return (
    <FormProvider key={parsedTemplate.name} form={form}>
      <FieldsRenderer resolvedFields={resolvedFields} form={form} />
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
