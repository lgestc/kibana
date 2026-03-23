/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ActionConnector, TemplateConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';
import { FormFields } from './form_fields';
import { templateDeserializer, templateSerializer } from './utils';
import type { TemplateFormProps } from './types';
import type { CasesConfigurationUI } from '../../containers/types';

interface Props {
  onChange: (state: FormState<TemplateFormProps, TemplateConfiguration>) => void;
  initialValue: TemplateConfiguration | null;
  connectors: ActionConnector[];
  currentConfiguration: CasesConfigurationUI;
  isEditMode?: boolean;
}

const FormComponent: React.FC<Props> = ({
  onChange,
  initialValue,
  connectors,
  currentConfiguration,
  isEditMode = false,
}) => {
  const keyDefaultValue = useMemo(() => uuidv4(), []);

  const defaultValues: TemplateFormProps = initialValue
    ? templateDeserializer(initialValue) ?? {
        key: keyDefaultValue,
        name: '',
        templateDescription: '',
        templateTags: [],
        connectorId: currentConfiguration.connector?.id ?? 'none',
        fields: null,
        customFields: {},
        tags: [],
        syncAlerts: true,
        extractObservables: true,
      }
    : {
        key: keyDefaultValue,
        name: '',
        templateDescription: '',
        templateTags: [],
        connectorId: currentConfiguration.connector?.id ?? 'none',
        fields: null,
        customFields: {},
        tags: [],
        syncAlerts: true,
        extractObservables: true,
      };

  const methods = useForm<TemplateFormProps>({
    defaultValues: defaultValues as DefaultValues<TemplateFormProps>,
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = methods;

  const submit = useCallback(
    (): Promise<{ isValid: boolean; data: TemplateConfiguration }> =>
      new Promise((resolve) => {
        handleSubmit(
          (data) => {
            const serialized = templateSerializer(connectors, currentConfiguration, data);
            resolve({ isValid: true, data: serialized });
          },
          () => {
            resolve({ isValid: false, data: {} as TemplateConfiguration });
          }
        )();
      }),
    [handleSubmit, connectors, currentConfiguration]
  );

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <FormProvider {...methods}>
      <input type="hidden" {...methods.register('key')} />
      <FormFields
        isSubmitting={methods.formState.isSubmitting}
        connectors={connectors}
        currentConfiguration={currentConfiguration}
        isEditMode={isEditMode}
        initialValue={initialValue}
      />
    </FormProvider>
  );
};

FormComponent.displayName = 'TemplateForm';

export const TemplateForm = React.memo(FormComponent);
