/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CategoryFormField, validateCategory } from './category_form_field';
import { categories } from '../../containers/mock';
import { MAX_CATEGORY_LENGTH } from '../../../common/constants';

// Failing: See https://github.com/elastic/kibana/issues/177791
describe('Category', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the category field correctly', async () => {
    render(
      <CategoryFormField
        isLoading={false}
        value={null}
        onChange={onChange}
        availableCategories={categories}
      />
    );

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
  });

  it('calls onChange when a category is selected', async () => {
    const TestWrapper = () => {
      const [value, setValue] = useState<string | null>(null);
      return (
        <CategoryFormField
          isLoading={false}
          value={value}
          onChange={(v) => {
            setValue(v ?? null);
            onChange(v);
          }}
          availableCategories={categories}
        />
      );
    };

    render(<TestWrapper />);

    await userEvent.type(await screen.findByRole('combobox'), `${categories[1]}{enter}`);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(categories[1]);
    });
  });

  it('disables the component correctly when it is loading', async () => {
    render(
      <CategoryFormField
        isLoading={true}
        value={null}
        onChange={onChange}
        availableCategories={categories}
      />
    );

    expect(await screen.findByRole('combobox')).toBeDisabled();
  });

  describe('validateCategory', () => {
    it('returns undefined for null', () => {
      expect(validateCategory(null)).toBeUndefined();
    });

    it('returns error for empty string', () => {
      expect(validateCategory('')).toBeDefined();
    });

    it('returns error for whitespace-only string', () => {
      expect(validateCategory('   ')).toBeDefined();
    });

    it(`returns error for string longer than ${MAX_CATEGORY_LENGTH}`, () => {
      expect(validateCategory('a'.repeat(MAX_CATEGORY_LENGTH + 1))).toBeDefined();
    });

    it('returns undefined for valid category', () => {
      expect(validateCategory('my category')).toBeUndefined();
    });
  });
});
