/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import * as i18n from './translations';

interface Props {
  value: string;
  onChange: (v: string) => void;
  isLoading: boolean;
  error?: string;
  autoFocus?: boolean;
}

const TitleComponent: React.FC<Props> = ({
  value,
  onChange,
  isLoading,
  error,
  autoFocus = false,
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.NAME}
    error={error}
    isInvalid={Boolean(error)}
    data-test-subj="caseTitle-form-row"
  >
    <EuiFieldText
      id="caseTitle"
      aria-describedby="caseTitle"
      data-test-subj="caseTitle"
      autoFocus={autoFocus}
      fullWidth
      disabled={isLoading}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </EuiFormRow>
);

TitleComponent.displayName = 'TitleComponent';

export const Title = memo(TitleComponent);
