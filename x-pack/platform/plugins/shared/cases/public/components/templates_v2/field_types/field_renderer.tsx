/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import React, { useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from './evaluate_conditions';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getYamlDefaultAsString } from '../utils';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}

export const FieldsRenderer: FC<{ parsedTemplate: ParsedTemplateDefinition }> = ({
  parsedTemplate,
}) => {
  const fieldTypeMap = useMemo(
    () => Object.fromEntries(parsedTemplate.fields.map((f) => [f.name, f.type])),
    [parsedTemplate.fields]
  );

  const allFieldPaths = useMemo(
    () => parsedTemplate.fields.map((f) => `${CASE_EXTENDED_FIELDS}.${f.name}_as_${f.type}`),
    [parsedTemplate.fields]
  );

  const watchedValues = useWatch({ name: allFieldPaths }) as unknown[];

  const fieldValues = useMemo(
    () => Object.fromEntries(parsedTemplate.fields.map((f, i) => [f.name, watchedValues[i]])),
    [watchedValues, parsedTemplate.fields]
  );

  return (
    <>
      {parsedTemplate.fields.map((field) => {
        // Evaluate display condition — skip rendering if false
        if (field.display?.show_when) {
          const shouldShow = evaluateCondition(field.display.show_when, fieldValues, fieldTypeMap);
          if (!shouldShow) return null;
        }

        // Compute isRequired from static flag or conditional
        const isRequired =
          field.validation?.required === true ||
          (field.validation?.required_when
            ? evaluateCondition(field.validation.required_when, fieldValues, fieldTypeMap)
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

export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  onFieldDefaultChange,
}) => {
  const templateKey = React.useMemo(
    () => parsedTemplate.fields.map((f) => `${f.name}:${f.type}`).join('|'),
    [parsedTemplate.fields]
  );

  const initialDefaultValues = React.useMemo(() => {
    const defaults: Record<string, Record<string, string>> = {
      [CASE_EXTENDED_FIELDS]: {},
    };
    for (const field of parsedTemplate.fields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = `${field.name}_as_${field.type}`;
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
    return defaults;
  }, [parsedTemplate.fields]);

  const methods = useForm({
    defaultValues: initialDefaultValues,
  });

  useYamlFormSync(methods, parsedTemplate.fields, onFieldDefaultChange);

  return (
    <FormProvider key={templateKey} {...methods}>
      <FieldsRenderer parsedTemplate={parsedTemplate} />
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
