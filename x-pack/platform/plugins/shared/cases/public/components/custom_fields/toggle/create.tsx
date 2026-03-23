/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';

const CreateComponent: CustomFieldType<CaseCustomFieldToggle>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setDefaultValue = true,
}) => {
  const { control } = useFormContext();
  const { key, label, defaultValue } = customFieldConfiguration;
  const fieldDefaultValue = defaultValue && setDefaultValue ? defaultValue : false;

  return (
    <Controller
      name={`customFields.${key}`}
      control={control}
      defaultValue={fieldDefaultValue}
      render={({ field }) => (
        <EuiFormRow fullWidth label={label}>
          <EuiSwitch
            data-test-subj={`${key}-toggle-create-custom-field`}
            disabled={isLoading}
            label=""
            checked={Boolean(field.value)}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        </EuiFormRow>
      )}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
