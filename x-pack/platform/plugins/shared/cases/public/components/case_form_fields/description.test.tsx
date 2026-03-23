/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Description } from './description';

import { MAX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { renderWithTestingProviders } from '../../common/mock';

describe('Description', () => {
  const draftStorageKey = `cases.caseView.createCase.description.markdownEditor`;

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('it renders', async () => {
    renderWithTestingProviders(
      <Description
        draftStorageKey={draftStorageKey}
        isLoading={false}
        value=""
        onChange={jest.fn()}
      />
    );

    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('it changes the description', async () => {
    const onChange = jest.fn();
    const TestWrapper = () => {
      const [value, setValue] = useState('');
      return (
        <Description
          draftStorageKey={draftStorageKey}
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

    const description = await screen.findByTestId('euiMarkdownEditorTextArea');

    await userEvent.click(description);
    await userEvent.paste('My new description');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('My new description'));
    });
  });

  it('shows an error when error prop is provided', async () => {
    renderWithTestingProviders(
      <Description
        draftStorageKey={draftStorageKey}
        isLoading={false}
        value=""
        onChange={jest.fn()}
        error="A description is required."
      />
    );

    expect(await screen.findByText('A description is required.')).toBeInTheDocument();
  });

  it('shows an error when description is too long', async () => {
    const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const errorMessage = `The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH} characters.`;

    renderWithTestingProviders(
      <Description
        draftStorageKey={draftStorageKey}
        isLoading={false}
        value={longDescription}
        onChange={jest.fn()}
        error={errorMessage}
      />
    );

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
