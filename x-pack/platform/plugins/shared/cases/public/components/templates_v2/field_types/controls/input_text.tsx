/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { Controller, useFormContext } from 'react-hook-form';
import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  InputTextFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import {
  FIELD_REQUIRED,
  FIELD_MIN_LENGTH,
  FIELD_MAX_LENGTH,
  FIELD_PATTERN_MISMATCH,
  FIELD_PATTERN_INVALID,
} from '../../translations';

type InputTextProps = z.infer<typeof InputTextFieldSchema> & ConditionRenderProps;

export const InputText: React.FC<InputTextProps> = ({
  label,
  name,
  type,
  isRequired,
  patternValidation,
  minLength,
  maxLength,
}) => {
  const { control } = useFormContext();
  const fieldPath = `${CASE_EXTENDED_FIELDS}.${name}_as_${type}`;

  return (
    <Controller
      name={fieldPath}
      control={control}
      defaultValue=""
      rules={{
        required: isRequired ? FIELD_REQUIRED : false,
        minLength:
          minLength !== undefined
            ? { value: minLength, message: FIELD_MIN_LENGTH(minLength) }
            : undefined,
        maxLength:
          maxLength !== undefined
            ? { value: maxLength, message: FIELD_MAX_LENGTH(maxLength) }
            : undefined,
        validate: {
          pattern: (value) => {
            if (!patternValidation || typeof value !== 'string' || value === '') return true;
            try {
              return new RegExp(patternValidation.regex).test(value)
                ? true
                : patternValidation.message ?? FIELD_PATTERN_MISMATCH(patternValidation.regex);
            } catch {
              return FIELD_PATTERN_INVALID;
            }
          },
        },
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow
          fullWidth
          label={label}
          error={fieldState.error?.message}
          isInvalid={Boolean(fieldState.error)}
        >
          <EuiFieldText
            fullWidth
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            isInvalid={Boolean(fieldState.error)}
          />
        </EuiFormRow>
      )}
    />
  );
};
InputText.displayName = 'InputText';
