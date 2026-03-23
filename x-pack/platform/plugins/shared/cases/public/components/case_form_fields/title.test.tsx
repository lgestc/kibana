/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Title } from './title';

describe('Title', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('it renders', async () => {
    render(<Title isLoading={false} value="My title" onChange={jest.fn()} />);

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
  });

  it('it disables the input when loading', async () => {
    render(<Title isLoading={true} value="" onChange={jest.fn()} />);
    expect(await screen.findByTestId('caseTitle')).toBeDisabled();
  });

  it('it changes the title', async () => {
    const onChange = jest.fn();
    const TestWrapper = () => {
      const [value, setValue] = useState('My title');
      return (
        <Title
          isLoading={false}
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    };

    render(<TestWrapper />);

    await userEvent.click(await screen.findByTestId('caseTitle'));
    await userEvent.paste(' is updated');

    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('is updated'));
  });
});
