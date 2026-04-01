/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useRef } from 'react';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { MarkdownEditorForm } from '../markdown_editor';
import { ID as LensPluginId } from '../markdown_editor/plugins/lens/constants';
import { MappedByTemplateLabel } from './mapped_by_template_label';

interface Props {
  isLoading: boolean;
  draftStorageKey?: string;
  isMappedByTemplate?: boolean;
}

export const fieldName = 'description';

const DescriptionComponent: React.FC<Props> = ({
  isLoading,
  draftStorageKey,
  isMappedByTemplate = false,
}) => {
  const [{ title, tags }] = useFormData({ watch: ['title', 'tags'] });
  const editorRef = useRef<Record<string, unknown>>();
  const disabledUiPlugins = [LensPluginId];

  return (
    <UseField
      path={fieldName}
      component={MarkdownEditorForm}
      config={isMappedByTemplate ? { labelAppend: <MappedByTemplateLabel /> } : undefined}
      componentProps={{
        id: fieldName,
        ref: editorRef,
        dataTestSubj: 'caseDescription',
        idAria: 'caseDescription',
        isDisabled: isLoading || isMappedByTemplate,
        caseTitle: title,
        caseTags: tags,
        disabledUiPlugins,
        draftStorageKey,
      }}
    />
  );
};

DescriptionComponent.displayName = 'DescriptionComponent';

export const Description = memo(DescriptionComponent);
