/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../../common/constants';
import { MAX_LENGTH_ERROR, REQUIRED_FIELD } from '../translations';
import { OptionalFieldLabel } from '../../optional_field_label';

const CreateComponent: CustomFieldType<CaseCustomFieldText>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setAsOptional,
  setDefaultValue = true,
}) => {
  const { control } = useFormContext();
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const isRequired = setAsOptional ? false : required;
  const fieldDefaultValue = defaultValue && setDefaultValue ? String(defaultValue) : undefined;

  return (
    <Controller
      name={`customFields.${key}`}
      control={control}
      defaultValue={fieldDefaultValue ?? ''}
      rules={{
        validate: (value: string) => {
          if (isRequired && !value?.trim()) {
            return REQUIRED_FIELD(label);
          }
          if (value != null && value.length > MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH) {
            return MAX_LENGTH_ERROR(label, MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH);
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
          <EuiFieldText
            data-test-subj={`${key}-text-create-custom-field`}
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
