/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncAlertsToggle } from './sync_alerts_toggle';

const ToggleWrapper = ({
  initialValue = true,
  onChange,
}: {
  initialValue?: boolean;
  onChange?: (v: boolean) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <SyncAlertsToggle
      isLoading={false}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
};

describe('SyncAlertsToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    render(<SyncAlertsToggle isLoading={false} value={true} onChange={jest.fn()} />);

    const switchEl = await screen.findByTestId('caseSyncAlerts');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText('Sync alert status with case status')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    render(<ToggleWrapper initialValue={true} />);

    const switchEl = await screen.findByTestId('caseSyncAlerts');
    await userEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(await screen.findByText('Sync alert status with case status')).toBeInTheDocument();
  });

  it('it renders with default value false', async () => {
    render(<SyncAlertsToggle isLoading={false} value={false} onChange={jest.fn()} />);

    const switchEl = await screen.findByTestId('caseSyncAlerts');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('it toggles the switch from false to true', async () => {
    render(<ToggleWrapper initialValue={false} />);

    const switchEl = await screen.findByTestId('caseSyncAlerts');
    await userEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with correct value when toggled', async () => {
    const onChange = jest.fn();
    render(<ToggleWrapper initialValue={true} onChange={onChange} />);

    const switchEl = await screen.findByTestId('caseSyncAlerts');
    await userEvent.click(switchEl);

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
