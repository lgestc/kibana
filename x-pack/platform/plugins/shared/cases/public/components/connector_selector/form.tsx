/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';

const ADD_CONNECTOR_HELPER_TEXT = i18n.translate(
  'xpack.cases.connectorSelector.addConnectorHelperText',
  {
    defaultMessage: 'Go to Cases > Settings to add an external incident management system',
  }
);

interface ConnectorSelectorProps {
  connectors: ActionConnector[];
  dataTestSubj: string;
  disabled: boolean;
  idAria: string;
  isLoading: boolean;
  // Legacy @kbn form field (used by out-of-scope callers)
  field?: FieldHook<string>;
  // Controlled mode (used by RHF-migrated callers)
  value?: string;
  onChange?: (val: string) => void;
  isInvalid?: boolean;
  error?: string;
  handleChange?: (newValue: string) => void;
}

export const ConnectorSelector = ({
  connectors,
  dataTestSubj,
  disabled = false,
  idAria,
  isLoading = false,
  field,
  value: controlledValue,
  onChange: controlledOnChange,
  isInvalid: controlledIsInvalid,
  error: controlledError,
  handleChange,
}: ConnectorSelectorProps) => {
  const fieldValidity = field ? getFieldValidityAndErrorMessage(field) : null;
  const isInvalid = fieldValidity ? fieldValidity.isInvalid : Boolean(controlledIsInvalid);
  const errorMessage = fieldValidity ? fieldValidity.errorMessage : controlledError;
  const currentValue = field ? field.value : controlledValue ?? '';
  const label = field ? field.label : undefined;
  const labelAppend = field ? field.labelAppend : undefined;

  const onChange = useCallback(
    (val: string) => {
      if (handleChange) {
        handleChange(val);
      }
      if (field) {
        field.setValue(val);
      } else if (controlledOnChange) {
        controlledOnChange(val);
      }
    },
    [handleChange, field, controlledOnChange]
  );

  const isConnectorAvailable = Boolean(
    connectors.find((connector) => connector.id === currentValue)
  );

  return (
    <EuiFormRow
      css={css`
        .euiFormErrorText {
          display: none;
        }
      `}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={ADD_CONNECTOR_HELPER_TEXT}
      isInvalid={isInvalid}
      label={label}
      labelAppend={labelAppend}
    >
      <ConnectorsDropdown
        connectors={connectors}
        disabled={disabled}
        isLoading={isLoading}
        onChange={onChange}
        selectedConnector={isEmpty(currentValue) || !isConnectorAvailable ? 'none' : currentValue}
      />
    </EuiFormRow>
  );
};
ConnectorSelector.displayName = 'ConnectorSelector';
