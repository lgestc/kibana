/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import type { CasesConfigurationUI } from '../../containers/types';
import type { CasePostRequest } from '../../../common/types/api';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { getInitialCaseValue } from '../../../common/utils/get_initial_case_value';
import { createFormSerializer, createFormDeserializer } from './utils';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
import { type UseSubmitCaseValue } from './use_submit_case';

interface CreateCaseFormContextValue {
  submit: () => void;
}

const CreateCaseFormContext = createContext<CreateCaseFormContextValue>({
  submit: () => {},
});

export const useCreateCaseFormContext = () => useContext(CreateCaseFormContext);

export interface FormContextProps {
  children?: JSX.Element | JSX.Element[];
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
  currentConfiguration: CasesConfigurationUI;
  selectedOwner: string;
  onSubmitCase: UseSubmitCaseValue['submitCase'];
}

export const FormContext: React.FC<FormContextProps> = ({
  children,
  initialValue,
  currentConfiguration,
  selectedOwner,
  onSubmitCase,
}) => {
  const { data: connectors = [] } = useGetSupportedActionConnectors();

  const rawDefaultValues = {
    ...getInitialCaseValue({
      owner: selectedOwner,
      connector: currentConfiguration.connector,
    }),
    ...initialValue,
  };

  const defaultValues = createFormDeserializer(rawDefaultValues as CasePostRequest);

  const methods = useForm<CaseFormFieldsSchemaProps>({
    defaultValues: {
      ...defaultValues,
      templateId: '',
      templateVersion: undefined,
      extendedFields: {},
    },
  });

  const { handleSubmit } = methods;

  const submit = useCallback(() => {
    handleSubmit(async (data) => {
      const serialized = createFormSerializer(
        connectors,
        { ...currentConfiguration, owner: selectedOwner },
        data
      );
      await onSubmitCase(serialized, true);
    })();
  }, [handleSubmit, connectors, currentConfiguration, selectedOwner, onSubmitCase]);

  return (
    <CreateCaseFormContext.Provider value={{ submit }}>
      <FormProvider {...methods}>
        <form>
          <div
            tabIndex={-1}
            onKeyDown={(e: React.KeyboardEvent) => {
              // It avoids the focus escaping from the flyout when enter is pressed.
              // https://github.com/elastic/kibana/issues/111120
              if (e.key === 'Enter') {
                e.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </form>
      </FormProvider>
    </CreateCaseFormContext.Provider>
  );
};

FormContext.displayName = 'FormContext';
