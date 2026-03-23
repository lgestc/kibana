/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFlexGroup, EuiFormRow, EuiTextArea } from '@elastic/eui';
import { OptionalFieldLabel } from '../optional_field_label';
import { TemplateTags } from './template_tags';
import type { TemplateFormProps } from './types';
import * as i18n from './translations';
import {
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
} from '../../../common/constants';

const TemplateFieldsComponent: React.FC<{
  isLoading: boolean;
  configurationTemplateTags: string[];
}> = ({ isLoading = false, configurationTemplateTags }) => {
  const { control } = useFormContext<TemplateFormProps>();

  return (
    <EuiFlexGroup data-test-subj="template-fields" direction="column" gutterSize="none">
      <Controller
        name="name"
        control={control}
        rules={{
          validate: (value: string | undefined) => {
            if (!value?.trim()) return i18n.REQUIRED_FIELD(i18n.TEMPLATE_NAME);
            if (value.length > MAX_TEMPLATE_NAME_LENGTH) {
              return i18n.MAX_LENGTH_ERROR('template name', MAX_TEMPLATE_NAME_LENGTH);
            }
            return undefined;
          },
        }}
        render={({ field, fieldState }) => (
          <EuiFormRow
            fullWidth
            label={i18n.TEMPLATE_NAME}
            error={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
          >
            <EuiFieldText
              data-test-subj="template-name-input"
              fullWidth
              autoFocus={false}
              isLoading={isLoading}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              isInvalid={Boolean(fieldState.error)}
            />
          </EuiFormRow>
        )}
      />
      <TemplateTags isLoading={isLoading} tagOptions={configurationTemplateTags} />
      <Controller
        name="templateDescription"
        control={control}
        rules={{
          validate: (value: string | undefined) => {
            if (value && value.length > MAX_TEMPLATE_DESCRIPTION_LENGTH) {
              return i18n.MAX_LENGTH_ERROR('template description', MAX_TEMPLATE_DESCRIPTION_LENGTH);
            }
            return undefined;
          },
        }}
        render={({ field, fieldState }) => (
          <EuiFormRow
            fullWidth
            label={i18n.DESCRIPTION}
            labelAppend={OptionalFieldLabel}
            error={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
          >
            <EuiTextArea
              data-test-subj="template-description-input"
              fullWidth
              isLoading={isLoading}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              isInvalid={Boolean(fieldState.error)}
            />
          </EuiFormRow>
        )}
      />
    </EuiFlexGroup>
  );
};

TemplateFieldsComponent.displayName = 'TemplateFields';

export const TemplateFields = memo(TemplateFieldsComponent);
