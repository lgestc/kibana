/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useEffect, useRef } from 'react';
import { camelCase } from 'lodash';
import type { z } from '@kbn/zod/v4';
import { FormProvider, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import type { OnUpdateFields } from '../types';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

interface TemplateFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
  loadingKey: string | null;
}

const TemplateFieldsForm: FC<{
  parsedTemplate: ParsedTemplateDefinition;
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
}> = ({ parsedTemplate, extendedFields, onUpdateField }) => {
  const templateKey = parsedTemplate.fields.map((f) => `${f.name}:${f.type}`).join('|');

  const initialDefaultValues = useMemo(() => {
    const defaults: Record<string, Record<string, unknown>> = { [CASE_EXTENDED_FIELDS]: {} };
    for (const field of parsedTemplate.fields) {
      const fieldKey = `${field.name}_as_${field.type}`;
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = extendedFields[camelCase(fieldKey)] ?? '';
    }
    return defaults;
  }, [parsedTemplate.fields, extendedFields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  const onUpdateFieldRef = useRef(onUpdateField);
  onUpdateFieldRef.current = onUpdateField;

  const extendedFieldsRef = useRef(extendedFields);
  extendedFieldsRef.current = extendedFields;

  const lastSentValuesRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    // Seed lastSentValues so the immediate subscription fire doesn't trigger updates
    for (const field of parsedTemplate.fields) {
      const fieldKey = `${field.name}_as_${field.type}`;
      lastSentValuesRef.current[fieldKey] = extendedFieldsRef.current[camelCase(fieldKey)] ?? '';
    }

    const subscription = form.subscribe(({ data }) => {
      const fields = (data.internal as Record<string, Record<string, unknown>>)?.[
        CASE_EXTENDED_FIELDS
      ];
      if (!fields) return;
      for (const field of parsedTemplate.fields) {
        const fieldKey = `${field.name}_as_${field.type}`;
        const value = fields[fieldKey];
        if (value !== lastSentValuesRef.current[fieldKey]) {
          lastSentValuesRef.current[fieldKey] = value;
          onUpdateFieldRef.current({ key: CASE_EXTENDED_FIELDS, value: { [fieldKey]: value } });
        }
      }
    });
    return subscription.unsubscribe;
  }, [form, parsedTemplate.fields]); // extendedFields removed — accessed via ref

  return (
    <FormProvider key={templateKey} form={form}>
      <FieldsRenderer parsedTemplate={parsedTemplate} form={form} />
    </FormProvider>
  );
};

TemplateFieldsForm.displayName = 'TemplateFieldsForm';

export const TemplateFields = React.memo<TemplateFieldsProps>(({ caseData, onUpdateField }) => {
  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);

  const parsedTemplate = templateData?.definition;
  if (!parsedTemplate) return null;

  return (
    <TemplateFieldsForm
      parsedTemplate={parsedTemplate}
      extendedFields={caseData.extendedFields ?? {}}
      onUpdateField={onUpdateField}
    />
  );
});

TemplateFields.displayName = 'TemplateFields';
