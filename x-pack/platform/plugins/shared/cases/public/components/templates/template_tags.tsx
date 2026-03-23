/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from './translations';
import { MAX_TAGS_PER_TEMPLATE, MAX_TEMPLATE_TAG_LENGTH } from '../../../common/constants';
import {
  validateEmptyTags,
  validateMaxLength,
  validateMaxTagsLength,
} from '../case_form_fields/utils';
import type { TemplateFormProps } from './types';

interface Props {
  isLoading: boolean;
  tagOptions: string[];
}

const TemplateTagsComponent: React.FC<Props> = ({ isLoading, tagOptions }) => {
  const { control } = useFormContext<TemplateFormProps>();
  const options = useMemo(() => tagOptions.map((label) => ({ label })), [tagOptions]);

  return (
    <Controller
      name="templateTags"
      control={control}
      rules={{
        validate: (value: string[] | undefined) => {
          if (!Array.isArray(value)) return undefined;
          for (const tag of value) {
            const emptyErr = validateEmptyTags({ value: tag, message: i18n.TAGS_EMPTY_ERROR });
            if (emptyErr) return i18n.TAGS_EMPTY_ERROR;
            const lenErr = validateMaxLength({
              value: tag,
              message: i18n.MAX_LENGTH_ERROR('tag', MAX_TEMPLATE_TAG_LENGTH),
              limit: MAX_TEMPLATE_TAG_LENGTH,
            });
            if (lenErr) return i18n.MAX_LENGTH_ERROR('tag', MAX_TEMPLATE_TAG_LENGTH);
          }
          const maxTagsErr = validateMaxTagsLength({
            value,
            message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_TEMPLATE),
            limit: MAX_TAGS_PER_TEMPLATE,
          });
          if (maxTagsErr) return i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_TEMPLATE);
          return undefined;
        },
      }}
      render={({ field, fieldState }) => {
        const selectedOptions = (field.value ?? []).map((label: string) => ({ label }));

        const onComboChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
          field.onChange(selected.map((o) => o.label));
        };

        return (
          <EuiFormRow
            fullWidth
            label={i18n.TAGS}
            labelAppend={OptionalFieldLabel}
            helpText={i18n.TEMPLATE_TAGS_HELP}
            error={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            data-test-subj="template-tags-row"
          >
            <EuiComboBox
              id="template-tags"
              aria-describedby="template-tags"
              data-test-subj="template-tags"
              fullWidth
              placeholder=""
              isDisabled={isLoading}
              isLoading={isLoading}
              options={options}
              selectedOptions={selectedOptions}
              onChange={onComboChange}
              noSuggestions={false}
              customOptionText={i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX}
              isClearable
            />
          </EuiFormRow>
        );
      }}
    />
  );
};

TemplateTagsComponent.displayName = 'TemplateTagsComponent';

export const TemplateTags = memo(TemplateTagsComponent);
