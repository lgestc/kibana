/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { memo } from 'react';
import { isEmpty } from 'lodash';
import { CaseSeverity } from '../../../common/types/domain';
import { SeveritySelector } from '../severity/selector';
import { SEVERITY_TITLE } from '../severity/translations';

interface Props {
  value: CaseSeverity;
  onChange: (v: CaseSeverity) => void;
  isLoading: boolean;
}

const SeverityComponent: React.FC<Props> = ({ value, onChange, isLoading }) => (
  <EuiFormRow data-test-subj="caseSeverity" fullWidth label={SEVERITY_TITLE}>
    <SeveritySelector
      isLoading={isLoading}
      isDisabled={isLoading}
      selectedSeverity={isEmpty(value) ? CaseSeverity.LOW : value}
      onSeverityChange={onChange}
    />
  </EuiFormRow>
);

SeverityComponent.displayName = 'SeverityComponent';

export const Severity = memo(SeverityComponent);
