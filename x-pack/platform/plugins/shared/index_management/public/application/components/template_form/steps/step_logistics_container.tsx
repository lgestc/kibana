/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Forms } from '../../../../shared_imports';
import { useLoadIndexTemplates } from '../../../services/api';
import type { WizardContent } from '../template_form';
import { StepLogistics } from './step_logistics';

interface Props {
  isLegacy?: boolean;
  isEditing?: boolean;
}

export const StepLogisticsContainer = ({ isEditing, isLegacy }: Props) => {
  const { defaultValue, updateContent } = Forms.useContent<WizardContent, 'logistics'>('logistics');
  const { data: templateData } = useLoadIndexTemplates();

  const currentName = defaultValue?.name as string | undefined;
  const availableTemplates = (templateData?.templates ?? [])
    .filter(({ name, extends: ext }) => name !== currentName && !ext)
    .map(({ name }) => name);

  return (
    <StepLogistics
      defaultValue={defaultValue}
      onChange={updateContent}
      isEditing={isEditing}
      isLegacy={isLegacy}
      availableTemplates={availableTemplates}
    />
  );
};
