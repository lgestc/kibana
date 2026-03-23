/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { MarkdownEditorForm } from '../markdown_editor';
import { ID as LensPluginId } from '../markdown_editor/plugins/lens/constants';
import * as i18n from '../../common/translations';

interface Props {
  value: string;
  onChange: (v: string) => void;
  isLoading: boolean;
  error?: string;
  caseTitle?: string;
  caseTags?: string[];
  draftStorageKey?: string;
}

export const fieldName = 'description';

const DescriptionComponent: React.FC<Props> = ({
  value,
  onChange,
  isLoading,
  error,
  caseTitle,
  caseTags,
  draftStorageKey,
}) => {
  const disabledUiPlugins = [LensPluginId];

  return (
    <MarkdownEditorForm
      id={fieldName}
      aria-labelledby="caseDescription"
      dataTestSubj="caseDescription"
      idAria="caseDescription"
      isDisabled={isLoading}
      caseTitle={caseTitle}
      caseTags={caseTags}
      disabledUiPlugins={disabledUiPlugins}
      draftStorageKey={draftStorageKey}
      value={value}
      onChange={onChange}
      error={error}
      label={i18n.DESCRIPTION}
    />
  );
};

DescriptionComponent.displayName = 'DescriptionComponent';

export const Description = memo(DescriptionComponent);
