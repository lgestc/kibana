/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The template schema was removed as part of the migration from @kbn/es-ui-shared-plugin
// hook_form_lib to react-hook-form. Validation now lives in Controller rules in each
// form component. See templates/form_fields.tsx and templates/template_tags.tsx.
describe('Template schema', () => {
  it('validation moved to Controller rules in form components', () => {
    // No-op: this test documents that schema validation was migrated to inline Controller rules
    expect(true).toBe(true);
  });
});
