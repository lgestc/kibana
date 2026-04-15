/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useGetTemplates } from '../../templates_v2/hooks/use_get_templates';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { useChangeAppliedTemplate } from '../use_change_applied_template';
import * as i18n from '../translations';

const NONE_OPTION: EuiComboBoxOptionOption<string> = {
  label: i18n.APPLIED_TEMPLATE_NONE,
  value: '',
};

interface ChangeAppliedTemplateProps {
  caseData: CaseUI;
}

export const ChangeAppliedTemplate: FC<ChangeAppliedTemplateProps> = ({ caseData }) => {
  const { euiTheme } = useEuiTheme();
  const { owner } = useCasesContext();

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner, isEnabled: true },
  });

  const currentTemplateId = caseData.template?.id ?? '';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(currentTemplateId);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => [
      NONE_OPTION,
      ...(templatesData?.templates ?? []).map((t) => ({
        label: t.name,
        value: t.templateId,
      })),
    ],
    [templatesData?.templates]
  );

  const selectedOption = useMemo(
    () => options.find((o) => o.value === selectedTemplateId) ?? NONE_OPTION,
    [options, selectedTemplateId]
  );

  const hasChanged = selectedTemplateId !== currentTemplateId;

  // Fetch the selected template's definition so we can compute extended_fields defaults.
  const { data: selectedTemplateData, isFetching: isFetchingTemplate } = useGetTemplate(
    hasChanged && selectedTemplateId ? selectedTemplateId : undefined
  );

  const { mutate: changeTemplate, isLoading: isChanging } = useChangeAppliedTemplate();

  const onChange = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedTemplateId(selected[0]?.value ?? '');
  }, []);

  const onApply = useCallback(() => {
    if (!hasChanged) return;

    if (!selectedTemplateId) {
      // Removing template — no definition fetch needed
      changeTemplate({ caseData, newTemplate: null });
      return;
    }

    if (!selectedTemplateData) return;

    const matched = templatesData?.templates.find((t) => t.templateId === selectedTemplateId);
    if (!matched) return;

    changeTemplate({
      caseData,
      newTemplate: {
        id: matched.templateId,
        version: matched.templateVersion,
        fields: selectedTemplateData.definition.fields,
      },
    });
  }, [hasChanged, selectedTemplateId, selectedTemplateData, templatesData?.templates, changeTemplate, caseData]);

  const isApplyDisabled =
    !hasChanged ||
    isChanging ||
    isLoadingTemplates ||
    (hasChanged && Boolean(selectedTemplateId) && (isFetchingTemplate || !selectedTemplateData));

  return (
    <EuiFormRow
      fullWidth
      label={i18n.APPLIED_TEMPLATE_LABEL}
      data-test-subj="change-applied-template"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          {isLoadingTemplates ? (
            <EuiSkeletonRectangle width="100%" height={euiTheme.size.xxl} borderRadius="m" />
          ) : (
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={[selectedOption]}
              onChange={onChange}
              isLoading={isFetchingTemplate || isChanging}
              placeholder={i18n.APPLIED_TEMPLATE_PLACEHOLDER}
              data-test-subj="change-applied-template-select"
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="primary"
            fill
            onClick={onApply}
            isDisabled={isApplyDisabled}
            isLoading={isChanging}
            data-test-subj="change-applied-template-apply"
          >
            {i18n.APPLIED_TEMPLATE_APPLY}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

ChangeAppliedTemplate.displayName = 'ChangeAppliedTemplate';
