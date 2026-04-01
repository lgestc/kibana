/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React from 'react';
import type { CaseSeverity } from '../../../common/types/domain';
import { SeveritySelector } from './selector';
import { SEVERITY_TITLE } from './translations';
import { MappedByTemplateLabel } from '../case_form_fields/mapped_by_template_label';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (status: CaseSeverity) => void;
  isLoading: boolean;
  isDisabled: boolean;
  isMappedByTemplate?: boolean;
}

export const SeveritySidebarSelector: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
  isMappedByTemplate = false,
}) => {
  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-severity">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{SEVERITY_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {isMappedByTemplate && (
          <EuiFlexItem grow={false}>
            <MappedByTemplateLabel />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <SeveritySelector
        isLoading={isLoading}
        selectedSeverity={selectedSeverity}
        onSeverityChange={onSeverityChange}
        isDisabled={isDisabled || isMappedByTemplate}
      />
    </EuiFlexItem>
  );
};
SeveritySidebarSelector.displayName = 'SeveritySidebarSelector';
