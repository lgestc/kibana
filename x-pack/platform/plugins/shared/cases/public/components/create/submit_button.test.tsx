/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useCreateCaseFormContext } from './form_context';
import { SubmitCaseButton } from './submit_button';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('./form_context');

describe('SubmitCaseButton', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useCreateCaseFormContext).mockReturnValue({ submit: onSubmit });
  });

  it('renders', async () => {
    renderWithTestingProviders(<SubmitCaseButton isSubmitting={false} />);

    expect(await screen.findByTestId('create-case-submit')).toBeInTheDocument();
  });

  it('submits', async () => {
    renderWithTestingProviders(<SubmitCaseButton isSubmitting={false} />);

    await userEvent.click(await screen.findByTestId('create-case-submit'));

    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('disables when submitting', async () => {
    renderWithTestingProviders(<SubmitCaseButton isSubmitting={true} />);

    expect(await screen.findByTestId('create-case-submit')).toBeDisabled();
  });
});
