/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import { getYamlDefaultAsString } from '../../templates_v2/utils';
import type { OnUpdateFields } from '../types';

export const EMPTY_EXTENDED_FIELDS: Record<string, unknown> = {};

/**
 * API exposed to a parent component when the form is used in batch mode
 * (i.e. `formApiRef` is provided). The parent calls `trigger()` to validate
 * all visible fields and, if valid, reads `getValues()` to collect the current
 * snake-keyed field values.
 */
export interface TemplateFieldsFormApi {
  trigger: () => Promise<boolean>;
  getValues: () => Record<string, unknown>;
}

interface TemplateFieldsFormReadyBaseProps {
  resolvedFields: InlineField[];
  extendedFields: Record<string, unknown>;
}

interface AutosaveProps extends TemplateFieldsFormReadyBaseProps {
  /** Per-field autosave mode (default). Required when `formApiRef` is not provided. */
  onUpdateField: (args: OnUpdateFields) => void;
  formApiRef?: never;
  applyDefaults?: never;
}

interface BatchProps extends TemplateFieldsFormReadyBaseProps {
  /**
   * Batch / validate-all mode. When provided, per-field autosave is disabled and the
   * parent drives validation and value collection through this ref.
   */
  formApiRef: MutableRefObject<TemplateFieldsFormApi | null>;
  /**
   * When `true`, seed each field's initial value with the template YAML default when
   * the case has no existing value for that field (i.e. carry-over logic). Only
   * meaningful in batch mode; ignored in autosave mode.
   */
  applyDefaults?: boolean;
  onUpdateField?: never;
}

export type TemplateFieldsFormReadyProps = AutosaveProps | BatchProps;

export const TemplateFieldsFormReady: FC<TemplateFieldsFormReadyProps> = ({
  resolvedFields,
  extendedFields,
  onUpdateField,
  formApiRef,
  applyDefaults = false,
}) => {
  const isBatchMode = formApiRef != null;

  const initialDefaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, unknown> = {};
    for (const field of resolvedFields) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      const existingValue = extendedFields[camelKey];
      if (isBatchMode && applyDefaults) {
        // In batch mode, fall back to the template's YAML default when the case has no value.
        inner[snakeKey] =
          existingValue !== undefined && existingValue !== ''
            ? existingValue
            : getYamlDefaultAsString(field.metadata?.default);
      } else {
        inner[snakeKey] = existingValue ?? '';
      }
    }
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [resolvedFields, extendedFields, isBatchMode, applyDefaults]);

  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset(initialDefaultValues, { keepDirtyValues: true });
  }, [initialDefaultValues, form]);

  // Register the form API on the ref so the parent can drive validation and read values.
  useEffect(() => {
    if (!formApiRef) return;
    formApiRef.current = {
      trigger: () => form.trigger(),
      getValues: () => form.getValues(CASE_EXTENDED_FIELDS) as Record<string, unknown>,
    };
    return () => {
      formApiRef.current = null;
    };
  }, [formApiRef, form]);

  const inflightRef = useRef(false);
  const [savingFieldKey, setSavingFieldKey] = useState<string>();

  const releaseLock = useCallback(() => {
    inflightRef.current = false;
    setSavingFieldKey(undefined);
  }, []);

  const persist = useCallback(
    async (fieldName: string, fieldType: string) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      const snakeKey = getFieldSnakeKey(fieldName, fieldType);
      setSavingFieldKey(snakeKey);
      const path = `${CASE_EXTENDED_FIELDS}.${snakeKey}`;
      const isValid = await form.trigger(path).catch(() => false);
      if (!isValid) {
        releaseLock();
        return;
      }
      const value = form.getValues(path);
      if (!onUpdateField) return;
      onUpdateField({
        key: CASE_EXTENDED_FIELDS,
        value: { [snakeKey]: value },
        onSuccess: () => {
          form.resetField(path, { defaultValue: value });
          releaseLock();
        },
        onError: releaseLock,
      });
    },
    [form, onUpdateField, releaseLock]
  );

  return (
    <FormProvider {...form}>
      <div data-test-subj="template-fields-form">
        <FieldsRenderer
          resolvedFields={resolvedFields}
          // In batch mode no per-field confirm/cancel buttons are shown; FieldsRenderer
          // already hides them when onFieldConfirm is undefined.
          onFieldConfirm={isBatchMode ? undefined : persist}
          savingFieldKey={isBatchMode ? undefined : savingFieldKey}
        />
      </div>
    </FormProvider>
  );
};

TemplateFieldsFormReady.displayName = 'TemplateFieldsFormReady';
