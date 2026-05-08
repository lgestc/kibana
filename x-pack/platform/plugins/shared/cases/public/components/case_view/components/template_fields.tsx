/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import type { z } from '@kbn/zod/v4';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import type { OnUpdateFields } from '../types';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

const BLUR_DEBOUNCE_MS = 200;

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

  const initialDefaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, unknown> = {};
    for (const field of parsedTemplate.fields) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      inner[snakeKey] = extendedFields[camelKey] ?? '';
    }
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [parsedTemplate.fields, extendedFields]);

  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: 'onBlur',
  });

  // Reset to fresh defaults whenever the underlying case data changes — e.g.
  // after a successful save the parent re-renders with new extendedFields.
  useEffect(() => {
    form.reset(initialDefaultValues);
  }, [initialDefaultValues, form]);

  const inflightRef = useRef(false);

  const releaseLock = useCallback(() => {
    inflightRef.current = false;
  }, []);

  const persist = useCallback(async () => {
    if (inflightRef.current) return;
    // Claim the lock synchronously before awaiting so a second invocation
    // can't race past the guard above.
    inflightRef.current = true;
    const isValid = await form.trigger().catch(() => false);
    if (!isValid) {
      releaseLock();
      return;
    }
    const values =
      (form.getValues() as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    onUpdateField({
      key: CASE_EXTENDED_FIELDS,
      value: values,
      onSuccess: releaseLock,
      onError: releaseLock,
    });
  }, [form, onUpdateField, releaseLock]);

  const handleBlurCapture = useMemo(() => debounce(persist, BLUR_DEBOUNCE_MS), [persist]);

  useEffect(() => () => handleBlurCapture.cancel(), [handleBlurCapture]);

  return (
    <FormProvider key={templateKey} {...form}>
      <div onBlurCapture={handleBlurCapture} data-test-subj="template-fields-form">
        <FieldsRenderer parsedTemplate={parsedTemplate} />
      </div>
    </FormProvider>
  );
};

TemplateFieldsForm.displayName = 'TemplateFieldsForm';

export const TemplateFields = React.memo<TemplateFieldsProps>(({ caseData, onUpdateField }) => {
  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);

  const parsedTemplate = templateData?.definition;
  if (!parsedTemplate || parsedTemplate.fields.length === 0) return null;

  return (
    <TemplateFieldsForm
      parsedTemplate={parsedTemplate}
      extendedFields={caseData.extendedFields ?? {}}
      onUpdateField={onUpdateField}
    />
  );
});

TemplateFields.displayName = 'TemplateFields';
