/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Title } from './title';
import { Tags } from './tags';
import { Category } from './category';
import { Severity } from './severity';
import { Description } from './description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from './assignees';
import { CustomFields } from './custom_fields';
import type { CasesConfigurationUI } from '../../containers/types';
import { KibanaServices } from '../../common/lib/kibana';
import { CreateCaseTemplateFields } from '../create/template_fields';
import type { CaseSeverity, CaseAssignees } from '../../../common/types/domain';
import {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
} from '../../../common/constants';
import { validateEmptyTags, validateMaxLength, validateMaxTagsLength } from './utils';
import * as i18n from './translations';
import { INVALID_ASSIGNEES } from '../user_profiles/translations';
import { validateCategory } from '../category/category_form_field';

interface Props {
  isLoading: boolean;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  setCustomFieldsOptional?: boolean;
  isEditMode?: boolean;
  draftStorageKey?: string;
  isCreateMode?: boolean;
}

const CaseFormFieldsComponent: React.FC<Props> = ({
  isLoading,
  configurationCustomFields,
  setCustomFieldsOptional = false,
  isEditMode,
  draftStorageKey,
  isCreateMode = false,
}) => {
  const { caseAssignmentAuthorized } = useCasesFeatures();
  const config = KibanaServices.getConfig();
  const isTemplatesV2Enabled = config?.templates?.enabled ?? false;
  const { control } = useFormContext();

  // Watch title and tags for description
  const title = useWatch({ name: 'title' }) as string;
  const tags = useWatch({ name: 'tags' }) as string[];

  return (
    <EuiFlexGroup data-test-subj="case-form-fields" direction="column" gutterSize="none">
      <Controller
        name="title"
        control={control}
        rules={{
          validate: (value: string) => {
            if (isCreateMode && !value?.trim()) return i18n.TITLE_REQUIRED;
            if (value && value.length > MAX_TITLE_LENGTH) {
              return i18n.MAX_LENGTH_ERROR('name', MAX_TITLE_LENGTH);
            }
            return undefined;
          },
        }}
        render={({ field, fieldState }) => (
          <Title
            value={field.value ?? ''}
            onChange={field.onChange}
            isLoading={isLoading}
            error={fieldState.error?.message}
          />
        )}
      />
      {caseAssignmentAuthorized ? (
        <Controller
          name="assignees"
          control={control}
          rules={{
            validate: (value: CaseAssignees) => {
              if (value && value.length > 10) return INVALID_ASSIGNEES;
              return undefined;
            },
          }}
          render={({ field, fieldState }) => (
            <Assignees
              value={field.value ?? []}
              onChange={field.onChange}
              isLoading={isLoading}
              isInvalid={Boolean(fieldState.error)}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}
      <Controller
        name="tags"
        control={control}
        rules={{
          validate: (value: string[]) => {
            if (!Array.isArray(value)) return undefined;
            for (const tag of value) {
              const emptyErr = validateEmptyTags({ value: tag, message: i18n.TAGS_EMPTY_ERROR });
              if (emptyErr) return i18n.TAGS_EMPTY_ERROR;
              const lenErr = validateMaxLength({
                value: tag,
                message: i18n.MAX_LENGTH_ERROR('tag', MAX_LENGTH_PER_TAG),
                limit: MAX_LENGTH_PER_TAG,
              });
              if (lenErr) return i18n.MAX_LENGTH_ERROR('tag', MAX_LENGTH_PER_TAG);
            }
            const maxTagsErr = validateMaxTagsLength({
              value,
              message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE),
              limit: MAX_TAGS_PER_CASE,
            });
            if (maxTagsErr) return i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE);
            return undefined;
          },
        }}
        render={({ field, fieldState }) => (
          <Tags
            value={field.value ?? []}
            onChange={field.onChange}
            isLoading={isLoading}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="category"
        control={control}
        rules={{
          validate: (value: string | null) => validateCategory(value),
        }}
        render={({ field, fieldState }) => (
          <Category
            value={field.value ?? null}
            onChange={field.onChange}
            isLoading={isLoading}
            isInvalid={Boolean(fieldState.error)}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="severity"
        control={control}
        render={({ field }) => (
          <Severity
            value={field.value as CaseSeverity}
            onChange={field.onChange}
            isLoading={isLoading}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        rules={{
          validate: (value: string) => {
            if (isCreateMode && !value?.trim()) return i18n.DESCRIPTION_REQUIRED;
            if (value && value.length > MAX_DESCRIPTION_LENGTH) {
              return i18n.MAX_LENGTH_ERROR('description', MAX_DESCRIPTION_LENGTH);
            }
            return undefined;
          },
        }}
        render={({ field, fieldState }) => (
          <Description
            value={field.value ?? ''}
            onChange={field.onChange}
            isLoading={isLoading}
            error={fieldState.error?.message}
            caseTitle={title}
            caseTags={tags}
            draftStorageKey={draftStorageKey}
          />
        )}
      />
      <CustomFields
        isLoading={isLoading}
        setCustomFieldsOptional={setCustomFieldsOptional}
        configurationCustomFields={configurationCustomFields}
        isEditMode={isEditMode}
      />
      {isTemplatesV2Enabled && <CreateCaseTemplateFields />}
    </EuiFlexGroup>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
