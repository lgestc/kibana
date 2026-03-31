/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useWatch } from 'react-hook-form';
import { useTemplateFormSync } from './use_template_form_sync';
import * as i18n from './translations';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';

export const CreateCaseTemplateFields: React.FC = () => {
  const templateId = useWatch<{ templateId?: string }, 'templateId'>({ name: 'templateId' });
  const { template, isLoading } = useTemplateFormSync();

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
      {fieldsFragment}
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
