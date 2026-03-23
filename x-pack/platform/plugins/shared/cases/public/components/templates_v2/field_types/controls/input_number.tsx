/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type { InputNumberFieldSchema } from '../../../../../common/types/domain/template/fields';

type InputNumberProps = z.infer<typeof InputNumberFieldSchema>;

export const InputNumber: React.FC<InputNumberProps> = ({ label, name, type }) => {
  const { control } = useFormContext();
  const fieldPath = `${CASE_EXTENDED_FIELDS}.${name}_as_${type}`;

  return (
    <Controller
      name={fieldPath}
      control={control}
      defaultValue=""
      render={({ field, fieldState }) => (
        <EuiFormRow
          fullWidth
          label={label}
          error={fieldState.error?.message}
          isInvalid={Boolean(fieldState.error)}
        >
          <EuiFieldNumber
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
InputNumber.displayName = 'InputNumber';
