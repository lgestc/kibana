/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load as parseYaml } from 'js-yaml';
import { buildYamlDefinition } from './utils';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { FieldType } from '../../../common/types/domain/template/fields';
import { CaseSeverity } from '../../../common/types/domain/case/v1';
import type { TemplateConfiguration, CustomFieldConfiguration } from '../../../common/types/domain';

interface YamlField {
  name: string;
  label: string;
  type: string;
  control: string;
  metadata?: Record<string, unknown>;
}

const textFieldConfig: CustomFieldConfiguration = {
  key: 'cf_text',
  label: 'Text Field',
  type: CustomFieldTypes.TEXT,
  required: false,
};

const numberFieldConfig: CustomFieldConfiguration = {
  key: 'cf_number',
  label: 'Number Field',
  type: CustomFieldTypes.NUMBER,
  required: false,
};

const toggleFieldConfig: CustomFieldConfiguration = {
  key: 'cf_toggle',
  label: 'Toggle Field',
  type: CustomFieldTypes.TOGGLE,
  required: false,
};

describe('buildYamlDefinition', () => {
  it('includes the template name', () => {
    const result = buildYamlDefinition({ key: 'k', name: 'My Template', caseFields: null }, []);
    const parsed = parseYaml(result) as Record<string, unknown>;
    expect(parsed.name).toBe('My Template');
  });

  it('uses template-level description when present', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      description: 'top-level desc',
      caseFields: { description: 'case-level desc' },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.description).toBe('top-level desc');
  });

  it('falls back to caseFields.description when template description is absent', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      caseFields: { description: 'case-level desc' },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.description).toBe('case-level desc');
  });

  it('omits description when neither is present', () => {
    const parsed = parseYaml(
      buildYamlDefinition({ key: 'k', name: 'T', caseFields: null }, [])
    ) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('description');
  });

  it('uses template-level tags when present', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      tags: ['a', 'b'],
      caseFields: { tags: ['c'] },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.tags).toEqual(['a', 'b']);
  });

  it('falls back to caseFields.tags', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      caseFields: { tags: ['c'] },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.tags).toEqual(['c']);
  });

  it('includes severity from caseFields', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      caseFields: { severity: CaseSeverity.HIGH },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.severity).toBe('high');
  });

  it('includes category from caseFields (including null)', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      caseFields: { category: null },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed).toHaveProperty('category');
    expect(parsed.category).toBeNull();
  });

  it('produces empty fields array when no customFields match', () => {
    const template: TemplateConfiguration = {
      key: 'k',
      name: 'T',
      caseFields: {
        customFields: [{ key: 'missing', type: CustomFieldTypes.TEXT, value: 'v' }],
      },
    };
    const parsed = parseYaml(buildYamlDefinition(template, [])) as Record<string, unknown>;
    expect(parsed.fields).toEqual([]);
  });

  describe('TEXT custom field', () => {
    it('includes field with INPUT_TEXT control and default value', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [textFieldConfig])) as Record<
        string,
        unknown
      >;
      const field = (parsed.fields as YamlField[])[0];
      expect(field.name).toBe('cf_text');
      expect(field.label).toBe('Text Field');
      expect(field.type).toBe('keyword');
      expect(field.control).toBe(FieldType.INPUT_TEXT);
      expect(field.metadata).toEqual({ default: 'hello' });
    });

    it('omits metadata when TEXT value is null', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: null }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [textFieldConfig])) as Record<
        string,
        unknown
      >;
      expect((parsed.fields as YamlField[])[0]).not.toHaveProperty('metadata');
    });
  });

  describe('NUMBER custom field', () => {
    it('includes field with INPUT_NUMBER control and default value', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_number', type: CustomFieldTypes.NUMBER, value: 42 }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [numberFieldConfig])) as Record<
        string,
        unknown
      >;
      const field = (parsed.fields as YamlField[])[0];
      expect(field.type).toBe('integer');
      expect(field.control).toBe(FieldType.INPUT_NUMBER);
      expect(field.metadata).toEqual({ default: 42 });
    });

    it('omits metadata when NUMBER value is null', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_number', type: CustomFieldTypes.NUMBER, value: null }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [numberFieldConfig])) as Record<
        string,
        unknown
      >;
      expect((parsed.fields as YamlField[])[0]).not.toHaveProperty('metadata');
    });
  });

  describe('TOGGLE custom field', () => {
    it('includes field with SELECT_BASIC control and true default', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_toggle', type: CustomFieldTypes.TOGGLE, value: true }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [toggleFieldConfig])) as Record<
        string,
        unknown
      >;
      const field = (parsed.fields as YamlField[])[0];
      expect(field.control).toBe(FieldType.SELECT_BASIC);
      expect(field.metadata).toEqual({ options: ['true', 'false'], default: 'true' });
    });

    it('includes options but no default when TOGGLE value is null', () => {
      const template: TemplateConfiguration = {
        key: 'k',
        name: 'T',
        caseFields: {
          customFields: [{ key: 'cf_toggle', type: CustomFieldTypes.TOGGLE, value: null }],
        },
      };
      const parsed = parseYaml(buildYamlDefinition(template, [toggleFieldConfig])) as Record<
        string,
        unknown
      >;
      const field = (parsed.fields as YamlField[])[0];
      expect(field.metadata).toEqual({ options: ['true', 'false'] });
      expect(field.metadata).not.toHaveProperty('default');
    });
  });

  it('handles null caseFields gracefully', () => {
    const template: TemplateConfiguration = { key: 'k', name: 'T', caseFields: null };
    expect(() => buildYamlDefinition(template, [textFieldConfig])).not.toThrow();
    const parsed = parseYaml(buildYamlDefinition(template, [textFieldConfig])) as Record<
      string,
      unknown
    >;
    expect(parsed.fields).toEqual([]);
  });
});
