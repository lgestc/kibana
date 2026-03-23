/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { getConnectorById } from '../utils';
import { connectorValidator as swimlaneConnectorValidator } from '../connectors/swimlane/validator';
import { ConnectorTypes } from '../../../common/types/domain';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';
import { useCasesContext } from '../cases_context/use_cases_context';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  isLoadingConnectors: boolean;
}

const ConnectorComponent: React.FC<Props> = ({ connectors, isLoading, isLoadingConnectors }) => {
  const { control, setValue } = useFormContext();
  const connectorId = useWatch({ name: 'connectorId' }) as string;
  const connector = getConnectorById(connectorId, connectors) ?? null;
  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();
  const hasReadPermissions = permissions.connectors && actions.read;

  // Local @kbn form used only for ConnectorFieldsForm (out-of-scope connector components use @kbn's UseField)
  const { form: localForm } = useForm({
    defaultValue: { fields: null },
    options: { stripEmptyFields: false },
  });

  // When the connector changes, reset the local form with empty fields
  useEffect(() => {
    localForm.reset({ resetValues: true, defaultValue: { fields: null } });
    setValue('fields', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorId]);

  // Sync local @kbn form fields → RHF
  useEffect(() => {
    const subscription = localForm.subscribe(({ data }) => {
      const localFields = (data.internal as Record<string, unknown>)?.fields ?? null;
      setValue('fields', localFields);
    });
    return subscription.unsubscribe;
  }, [localForm, setValue]);

  if (!hasReadPermissions) {
    return (
      <EuiText data-test-subj="create-case-connector-permissions-error-msg" size="s">
        <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
      </EuiText>
    );
  }

  const typeValidators: Record<string, (c: ActionConnector) => { message: string } | undefined> = {
    [ConnectorTypes.swimlane]: swimlaneConnectorValidator as (
      c: ActionConnector
    ) => { message: string } | undefined,
  };

  const validateConnectorId = (value: string): string | undefined => {
    const c = getConnectorById(value, connectors);
    if (c != null) {
      if (c.isDeprecated) return 'Deprecated connector';
      const typeResult = typeValidators[c.actionTypeId]?.(c);
      if (typeResult) return typeResult.message;
    }
    return undefined;
  };

  return (
    <EuiFormRow fullWidth>
      <>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Controller
              name="connectorId"
              control={control}
              rules={{
                validate: (value: string) => validateConnectorId(value),
              }}
              render={({ field, fieldState }) => (
                <ConnectorSelector
                  connectors={connectors}
                  dataTestSubj="caseConnectors"
                  disabled={isLoading || isLoadingConnectors}
                  idAria="caseConnectors"
                  isLoading={isLoading || isLoadingConnectors}
                  value={field.value}
                  onChange={field.onChange}
                  isInvalid={Boolean(fieldState.error)}
                  error={fieldState.error?.message}
                />
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Form form={localForm}>
              <ConnectorFieldsForm connector={connector} isInSidebarForm={false} />
            </Form>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
};

ConnectorComponent.displayName = 'ConnectorComponent';

export const Connector = memo(ConnectorComponent);
