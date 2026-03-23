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
  value: boolean;
  onChange: (v: boolean) => void;
  isLoading: boolean;
}

const SyncAlertsToggleComponent: React.FC<Props> = ({ value, onChange, isLoading }) => {
  return (
    <EuiFormRow fullWidth helpText={i18n.SYNC_ALERTS_HELP} data-test-subj="caseSyncAlerts-row">
      <EuiSwitch
        id="caseSyncAlerts"
        data-test-subj="caseSyncAlerts"
        disabled={isLoading}
        label={i18n.SYNC_ALERTS_LABEL}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};

SyncAlertsToggleComponent.displayName = 'SyncAlertsToggleComponent';

export const SyncAlertsToggle = memo(SyncAlertsToggleComponent);
