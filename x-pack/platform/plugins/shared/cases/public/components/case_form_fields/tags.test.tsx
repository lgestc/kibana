/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tags } from './tags';
import { renderWithTestingProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_tags');

const useGetTagsMock = useGetTags as jest.Mock;

describe('Tags', () => {
  beforeEach(() => {
    useGetTagsMock.mockReturnValue({ data: ['test'] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    renderWithTestingProviders(<Tags isLoading={false} value={[]} onChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('caseTags')).toBeInTheDocument();
    });
  });

  it('it changes the tags', async () => {
    const onChange = jest.fn();
    const TestWrapper = () => {
      const [value, setValue] = useState<string[]>([]);
      return (
        <Tags
          isLoading={false}
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    };

    renderWithTestingProviders(<TestWrapper />);

    await userEvent.type(screen.getByRole('combobox'), 'test{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['test']));
    });
  });
});
