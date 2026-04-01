/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { MAPPED_BY_TEMPLATE_TOOLTIP } from './translations';

export const MappedByTemplateLabel: React.FC = () => (
  <EuiToolTip content={MAPPED_BY_TEMPLATE_TOOLTIP}>
    <EuiIcon
      type="lock"
      size="s"
      color="subdued"
      aria-label={MAPPED_BY_TEMPLATE_TOOLTIP}
      data-test-subj="mapped-by-template-icon"
    />
  </EuiToolTip>
);
