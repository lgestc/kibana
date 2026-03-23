/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { Severity } from './severity';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { CaseSeverity } from '../../../common/types/domain';

describe('Severity form field', () => {
  it('renders', async () => {
    const onChange = jest.fn();
    render(<Severity isLoading={false} value={'low' as CaseSeverity} onChange={onChange} />);

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-severity-selection')).toBeEnabled();
  });

  // default to LOW in this test configuration
  it('defaults to the correct value', async () => {
    const onChange = jest.fn();
    render(<Severity isLoading={false} value={'low' as CaseSeverity} onChange={onChange} />);

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-severity-selection-low')).toBeInTheDocument();
  });

  it('calls onChange with the selected value when changed', async () => {
    const onChange = jest.fn();
    const TestWrapper = () => {
      const [value, setValue] = useState<CaseSeverity>('low' as CaseSeverity);
      return (
        <Severity
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

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId('case-severity-selection-high'));

    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('disables when loading data', async () => {
    render(<Severity isLoading={true} value={'low' as CaseSeverity} onChange={jest.fn()} />);

    expect(await screen.findByTestId('case-severity-selection')).toBeDisabled();
  });
});
