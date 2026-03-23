/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import {
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../common/translations';
import { CommentEditorContext } from './context';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';
import { type MarkdownEditorRef } from './types';
import { CommentEditor } from './comment_editor';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field?: FieldHook<string>;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
  label?: string;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseId?: string;
  caseTags?: string[];
  draftStorageKey?: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
};

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    (
      {
        id,
        field,
        value: controlledValue,
        onChange: controlledOnChange,
        error: controlledError,
        label: controlledLabel,
        dataTestSubj,
        idAria,
        bottomRightContent,
        caseTitle,
        caseTags,
        caseId,
        draftStorageKey,
        disabledUiPlugins,
        initialValue,
      },
      ref
    ) => {
      const value = field ? field.value : controlledValue ?? '';
      const onChange = field ? field.setValue : controlledOnChange ?? (() => {});
      const label = field ? field.label : controlledLabel;
      const helpText = field?.helpText;
      const labelAppend = field?.labelAppend;

      const { isInvalid, errorMessage } = field
        ? getFieldValidityAndErrorMessage(field)
        : { isInvalid: Boolean(controlledError), errorMessage: controlledError };

      const { hasConflicts } = useMarkdownSessionStorage({
        field,
        value,
        onChange,
        sessionKey: draftStorageKey ?? '',
        initialValue,
      });
      const { euiTheme } = useEuiTheme();

      const conflictWarningText = i18n.VERSION_CONFLICT_WARNING(
        id === 'description' ? id : 'comment'
      );

      const commentEditorContextValue = useMemo(
        () => ({
          editorId: id,
          value,
          caseTitle,
          caseTags,
        }),
        [id, value, caseTitle, caseTags]
      );

      return (
        <CommentEditorContext.Provider value={commentEditorContextValue}>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={helpText}
            isInvalid={isInvalid}
            label={label}
            labelAppend={labelAppend}
          >
            <CommentEditor
              ariaLabel={idAria}
              data-test-subj={`${dataTestSubj}-markdown-editor`}
              editorId={id}
              disabledUiPlugins={disabledUiPlugins}
              field={field}
              caseId={caseId}
              ref={ref}
              onChange={onChange}
              value={value}
            />
          </EuiFormRow>
          {bottomRightContent && (
            <EuiFlexGroup
              css={css`
                padding: ${euiTheme.size.m} 0;
              `}
              justifyContent={'flexEnd'}
            >
              <EuiFlexItem grow={false}>
                <EuiText color="danger" size="s">
                  {hasConflicts && conflictWarningText}
                </EuiText>
                <EuiSpacer size="s" />
                {bottomRightContent}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </CommentEditorContext.Provider>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
