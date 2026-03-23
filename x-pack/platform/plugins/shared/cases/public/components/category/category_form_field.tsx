/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFormRowProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { memo } from 'react';
import { MAX_CATEGORY_LENGTH } from '../../../common/constants';
import type { CategoryField } from './category_component';
import { CategoryComponent } from './category_component';
import { CATEGORY, EMPTY_CATEGORY_VALIDATION_MSG, MAX_LENGTH_ERROR } from './translations';

interface Props {
  value: CategoryField;
  onChange: (v: CategoryField) => void;
  isLoading: boolean;
  availableCategories: string[];
  isInvalid?: boolean;
  error?: string;
  formRowProps?: Partial<EuiFormRowProps>;
}

const CategoryFormFieldComponent: React.FC<Props> = ({
  value,
  onChange,
  isLoading,
  availableCategories,
  isInvalid = false,
  error,
  formRowProps,
}) => {
  return (
    <EuiFormRow
      {...formRowProps}
      label={CATEGORY}
      error={error}
      isInvalid={isInvalid}
      data-test-subj="caseCategory"
      fullWidth
    >
      <CategoryComponent
        isLoading={isLoading}
        onChange={onChange}
        category={value}
        availableCategories={availableCategories}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
};

CategoryFormFieldComponent.displayName = 'CategoryFormFieldComponent';

export const CategoryFormField = memo(CategoryFormFieldComponent);

/**
 * Validates a category value, returning an error message or undefined.
 */
export const validateCategory = (value: CategoryField): string | undefined => {
  if (value == null) return undefined;
  if (isEmpty(value.trim())) return EMPTY_CATEGORY_VALIDATION_MSG;
  if (value.length > MAX_CATEGORY_LENGTH) return MAX_LENGTH_ERROR('category', MAX_CATEGORY_LENGTH);
  return undefined;
};
