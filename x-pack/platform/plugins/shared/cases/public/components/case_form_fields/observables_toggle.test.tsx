/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObservablesToggle } from './observables_toggle';

const CASE_OBSERVABLES_TOGGLE_TEST_ID = 'caseObservablesToggle';

const ToggleWrapper = ({
  initialValue = true,
  onChange,
}: {
  initialValue?: boolean;
  onChange?: (v: boolean) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <ObservablesToggle
      isLoading={false}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
};

describe('ObservablesToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it render toggle correctly', async () => {
    render(<ObservablesToggle isLoading={false} value={true} onChange={jest.fn()} />);

    const switchEl = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText('Extract observables')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    render(<ToggleWrapper initialValue={true} />);

    const switchEl = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);

    await userEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('renders disabled toggle when loading', async () => {
    render(<ObservablesToggle isLoading={true} value={true} onChange={jest.fn()} />);
    const switchEl = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toBeDisabled();
  });
});
