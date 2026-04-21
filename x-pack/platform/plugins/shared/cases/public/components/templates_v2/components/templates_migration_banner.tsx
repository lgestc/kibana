/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import * as i18n from '../translations';

interface LegacyTemplatesMigrationBannerProps {
  legacyTemplateCount: number;
  onMigrate: () => void;
  isLoading: boolean;
}

export const LegacyTemplatesMigrationBanner: React.FC<LegacyTemplatesMigrationBannerProps> = ({
  legacyTemplateCount,
  onMigrate,
  isLoading,
}) => {
  return (
    <>
      <EuiCallOut
        title={i18n.LEGACY_MIGRATION_BANNER_TITLE(legacyTemplateCount)}
        color="warning"
        iconType="warning"
        data-test-subj="legacy-templates-migration-banner"
      >
        <p>{i18n.LEGACY_MIGRATION_BANNER_BODY}</p>
        <EuiButton
          color="warning"
          fill
          onClick={onMigrate}
          isLoading={isLoading}
          data-test-subj="legacy-templates-migration-button"
        >
          {i18n.LEGACY_MIGRATION_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
LegacyTemplatesMigrationBanner.displayName = 'LegacyTemplatesMigrationBanner';
