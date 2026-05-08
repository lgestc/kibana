/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiCallOut, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import {
  useFormContext as useParentFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useTemplateFormSync } from './use_template_form_sync';
import * as i18n from './translations';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';

type FormShape = Record<string, Record<string, unknown>>;

export const CreateCaseTemplateFields: React.FC = () => {
  const parentForm = useParentFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });

  const innerForm = useForm<FormShape>({
    defaultValues: { [CASE_EXTENDED_FIELDS]: {} },
  });

  const { template, isLoading } = useTemplateFormSync(innerForm);

  // Mirror the inner RHF `extendedFields` slice into the parent form_lib field
  // on every change so the parent's submission picks up the latest values.
  useEffect(() => {
    const subscription = innerForm.watch((values) => {
      const slice = values?.[CASE_EXTENDED_FIELDS] ?? {};
      parentForm.setFieldValue('extendedFields', slice);
    });
    return () => subscription.unsubscribe();
  }, [innerForm, parentForm]);

  const fieldsFragment = useMemo(() => {
    if (!template?.definition?.fields) {
      return null;
    }
    return <FieldsRenderer parsedTemplate={template.definition} />;
  }, [template]);

  if (isLoading) {
    return null;
  }

  if (!templateId || !fieldsFragment) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut announceOnMount title={i18n.TEMPLATE_NOT_SELECTED_TITLE} size="s">
          <p>{i18n.TEMPLATE_NOT_SELECTED_DESCRIPTION}</p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h4>{i18n.EXTENDED_FIELDS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer />
      <FormProvider {...innerForm}>{fieldsFragment}</FormProvider>
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
