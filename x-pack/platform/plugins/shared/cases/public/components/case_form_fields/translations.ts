/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const CUSTOM_FIELDS = i18n.translate('xpack.cases.customFields', {
  defaultMessage: 'Custom fields',
});

export const MAPPED_BY_TEMPLATE_TOOLTIP = i18n.translate(
  'xpack.cases.caseFormFields.mappedByTemplate',
  {
    defaultMessage: 'This field is set by the selected template and cannot be edited directly.',
  }
);
