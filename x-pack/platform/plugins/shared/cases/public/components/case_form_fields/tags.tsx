/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useGetTags } from '../../containers/use_get_tags';
import * as i18n from '../create/translations';
import { OptionalFieldLabel } from '../optional_field_label';

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  isLoading: boolean;
  error?: string;
}

const TagsComponent: React.FC<Props> = ({ value, onChange, isLoading, error }) => {
  const { data: tagOptions = [], isLoading: isLoadingTags } = useGetTags();
  const options = useMemo(
    () =>
      tagOptions.map((label) => ({
        label,
      })),
    [tagOptions]
  );

  const selectedOptions = value.map((label) => ({ label }));

  const onComboChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    onChange(selected.map((o) => o.label));
  };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.TAGS}
      helpText={i18n.TAGS_HELP}
      labelAppend={OptionalFieldLabel}
      error={error}
      isInvalid={Boolean(error)}
      data-test-subj="caseTags-form-row"
    >
      <EuiComboBox
        id="caseTags"
        aria-describedby="caseTags"
        data-test-subj="caseTags"
        fullWidth
        placeholder=""
        isDisabled={isLoading || isLoadingTags}
        isLoading={isLoadingTags}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onComboChange}
        onCreateOption={(searchValue) => {
          const trimmed = searchValue.trim();
          if (trimmed) onChange([...value, trimmed]);
        }}
        noSuggestions={false}
        customOptionText={i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX}
        isClearable
      />
    </EuiFormRow>
  );
};

TagsComponent.displayName = 'TagsComponent';

export const Tags = memo(TagsComponent);
