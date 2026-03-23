/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useGetCategories } from '../../containers/use_get_categories';
import { CategoryFormField } from '../category/category_form_field';
import { OptionalFieldLabel } from '../optional_field_label';
import type { CategoryField } from '../category/category_component';

interface Props {
  value: CategoryField;
  onChange: (v: CategoryField) => void;
  isLoading: boolean;
  isInvalid?: boolean;
  error?: string;
}

const CategoryComponent: React.FC<Props> = ({ value, onChange, isLoading, isInvalid, error }) => {
  const { isLoading: isLoadingCategories, data: categories = [] } = useGetCategories();

  return (
    <CategoryFormField
      value={value}
      onChange={onChange}
      isLoading={isLoading || isLoadingCategories}
      availableCategories={categories}
      isInvalid={isInvalid}
      error={error}
      formRowProps={{ labelAppend: OptionalFieldLabel }}
    />
  );
};

CategoryComponent.displayName = 'CategoryComponent';

export const Category = memo(CategoryComponent);
