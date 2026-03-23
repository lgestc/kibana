/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Category } from './category';
import { useGetCategories } from '../../containers/use_get_categories';
import { categories } from '../../containers/mock';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('../../containers/use_get_categories');

const useGetCategoriesMock = useGetCategories as jest.Mock;

describe('Category', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCategoriesMock.mockReturnValue({ isLoading: false, data: categories });
  });

  it('renders the category field correctly', () => {
    renderWithTestingProviders(<Category isLoading={false} value={null} onChange={onChange} />);

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
  });

  it('shows the optional label correctly', () => {
    renderWithTestingProviders(<Category isLoading={false} value={null} onChange={onChange} />);

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('disables the combobox when it is loading', () => {
    renderWithTestingProviders(<Category isLoading={true} value={null} onChange={onChange} />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('disables the combobox when is loading categories', async () => {
    useGetCategoriesMock.mockReturnValue({ isLoading: true, data: categories });

    renderWithTestingProviders(<Category isLoading={false} value={null} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  it('calls onChange when a category is selected', async () => {
    const category = 'test';
    useGetCategoriesMock.mockReturnValue({ isLoading: false, data: [category] });

    const TestWrapper = () => {
      const [value, setValue] = useState<string | null>(null);
      return (
        <Category
          isLoading={false}
          value={value}
          onChange={(v) => {
            setValue(v ?? null);
            onChange(v);
          }}
        />
      );
    };

    renderWithTestingProviders(<TestWrapper />);

    await userEvent.type(screen.getByRole('combobox'), `${category}{enter}`);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(category);
    });
  });
});
