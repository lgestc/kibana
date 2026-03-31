/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  SelectBasicFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';

type SelectBasicProps = z.infer<typeof SelectBasicFieldSchema> & ConditionRenderProps;

export const SelectBasic: React.FC<SelectBasicProps> = ({
  label,
  metadata,
  name,
  type,
  isRequired,
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
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow
          fullWidth
          label={label}
          error={fieldState.error?.message}
          isInvalid={Boolean(fieldState.error)}
        >
          <EuiSelect
            fullWidth
            options={metadata.options.map((option) => ({ value: option, text: option }))}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            isInvalid={Boolean(fieldState.error)}
          />
        </EuiFormRow>
      )}
    />
  );
};
SelectBasic.displayName = 'SelectBasic';
