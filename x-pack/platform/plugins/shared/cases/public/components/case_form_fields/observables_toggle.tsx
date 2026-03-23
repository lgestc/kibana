/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import * as i18n from '../create/translations';

interface Props {
  /**
   * Whether the component is loading
   */
  value: boolean;
  onChange: (v: boolean) => void;
  isLoading: boolean;
}

/**
 * This component is used to toggle the extract observables feature in the create case flyout.
 */
const ObservablesToggleComponent: React.FC<Props> = ({ value, onChange, isLoading }) => {
  return (
    <EuiFormRow
      fullWidth
      helpText={i18n.EXTRACT_OBSERVABLES_HELP}
      data-test-subj="caseObservablesToggle-row"
    >
      <EuiSwitch
        id="caseObservablesToggle"
        data-test-subj="caseObservablesToggle"
        disabled={isLoading}
        label={i18n.EXTRACT_OBSERVABLES_LABEL}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};

ObservablesToggleComponent.displayName = 'ObservablesToggleComponent';

export const ObservablesToggle = memo(ObservablesToggleComponent);
