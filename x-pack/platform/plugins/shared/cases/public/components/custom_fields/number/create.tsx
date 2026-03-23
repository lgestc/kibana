/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { REQUIRED_FIELD, SAFE_INTEGER_NUMBER_ERROR } from '../translations';
import { OptionalFieldLabel } from '../../optional_field_label';

const CreateComponent: CustomFieldType<CaseCustomFieldNumber>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setAsOptional,
  setDefaultValue = true,
}) => {
  const { control } = useFormContext();
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const isRequired = setAsOptional ? false : required;
  const fieldDefaultValue =
    defaultValue && setDefaultValue && !isNaN(Number(defaultValue))
      ? Number(defaultValue)
      : undefined;

  return (
    <Controller
      name={`customFields.${key}`}
      control={control}
      defaultValue={fieldDefaultValue ?? ''}
      rules={{
        validate: (value: string | number) => {
          if (isRequired && (value === '' || value == null)) {
            return REQUIRED_FIELD(label);
          }
          if (value != null && value !== '') {
            const numericValue = Number(value);
            if (!Number.isSafeInteger(numericValue)) {
              return SAFE_INTEGER_NUMBER_ERROR(label);
            }
          }
          return undefined;
        },
      }}
      render={({ field, fieldState }) => (
        <EuiFormRow
          fullWidth
          label={label}
          labelAppend={setAsOptional ? OptionalFieldLabel : null}
          error={fieldState.error?.message}
          isInvalid={Boolean(fieldState.error)}
        >
          <EuiFieldNumber
            data-test-subj={`${key}-number-create-custom-field`}
            fullWidth
            disabled={isLoading}
            isLoading={isLoading}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            isInvalid={Boolean(fieldState.error)}
          />
        </EuiFormRow>
      )}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
