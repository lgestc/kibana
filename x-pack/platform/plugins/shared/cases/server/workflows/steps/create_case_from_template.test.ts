/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { createCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.createCaseFromTemplate' });

describe('createCaseFromTemplateStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.createCaseFromTemplate');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        owner: 'securitySolution',
        case_template_id: 'triage_template',
      }).success
    ).toBe(true);
  });

  it('resolves template, merges overwrites, and creates the case', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              description: 'Template description',
              tags: ['template-tag'],
              connector: {
                id: 'none',
                name: 'none',
                type: '.none',
                fields: null,
              },
              settings: { syncAlerts: false },
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);

    const definition = createCaseFromTemplateStepDefinition(getCasesClient);
    const result = await definition.handler(
      createContext({
        case_template_id: 'triage_template',
        owner: 'securitySolution',
        overwrites: {
          title: 'Overwrite title',
          status: 'in-progress',
          connector: {
            id: 'webhook-1',
            name: 'Cases webhook',
            type: '.cases-webhook',
            fields: null,
          },
        },
      })
    );

    expect(get).toHaveBeenCalledWith({ owner: 'securitySolution' });
    expect(create).toHaveBeenCalledWith({
      title: 'Overwrite title',
      assignees: [],
      tags: ['template-tag'],
      category: undefined,
      severity: 'low',
      status: 'in-progress',
      description: 'Template description',
      settings: { syncAlerts: false },
      customFields: [],
      connector: {
        id: 'webhook-1',
        name: 'Cases webhook',
        type: '.cases-webhook',
        fields: null,
      },
      owner: 'securitySolution',
    });
    expect(result).toEqual({
      output: {
        case: expect.objectContaining({
          id: createCaseResponseFixture.id,
          owner: createCaseResponseFixture.owner,
          title: createCaseResponseFixture.title,
        }),
      },
    });
  });

  it('finds template across multiple configurations', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'first_template',
            name: 'First template',
            caseFields: { title: 'First template title' },
          },
        ],
      },
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: { title: 'Second config template title' },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        owner: 'securitySolution',
        case_template_id: 'triage_template',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Second config template title',
      })
    );
  });

  it('creates case from template defaults when overwrites are not provided', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              description: 'Template description',
              owner: 'securitySolution',
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        owner: 'securitySolution',
        case_template_id: 'triage_template',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Template title',
        description: 'Template description',
        owner: 'securitySolution',
      })
    );
  });

  it('returns error when template cannot be found', async () => {
    const create = jest.fn();
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        owner: 'securitySolution',
        case_template_id: 'missing_template',
      })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Case template not found');
  });

  it('pushes case when push-case is enabled', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const push = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              owner: 'securitySolution',
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create, push },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext(
        {
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        },
        { 'push-case': true }
      )
    );

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });

  describe('auto-resolution — v2 library tried first, v1 config as fallback', () => {
    const makeTemplateSO = (definition: Record<string, unknown>, owner = 'securitySolution') => ({
      attributes: {
        templateId: 'tpl-v2-1',
        templateVersion: 3,
        owner,
        name: 'V2 Triage',
        definition: yamlStringify(definition),
      },
    });

    const v2Definition = {
      name: 'V2 Triage',
      description: 'From v2 template',
      severity: 'high',
      tags: ['v2'],
      fields: [
        {
          name: 'priority',
          control: 'SELECT_BASIC',
          type: 'keyword',
          metadata: { options: ['low', 'high'], default: 'high' },
        },
      ],
    };

    it('resolves the v2 template when the library returns a matching-owner SO', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(makeTemplateSO(v2Definition));
      const getFieldDefinitions = jest.fn().mockResolvedValue({ fieldDefinitions: [] });
      const configureGet = jest.fn();
      const getCasesClient = jest.fn().mockResolvedValue({
        configure: { get: configureGet },
        templates: { getTemplate },
        fieldDefinitions: { getFieldDefinitions },
        cases: { create },
      } as unknown as CasesClient);
      const definition = createCaseFromTemplateStepDefinition(getCasesClient);

      await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'tpl-v2-1',
        })
      );

      // v2 path must not touch the v1 configuration path.
      expect(configureGet).not.toHaveBeenCalled();
      expect(getTemplate).toHaveBeenCalledWith('tpl-v2-1');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'V2 Triage',
          description: 'From v2 template',
          severity: 'high',
          tags: ['v2'],
          template: { id: 'tpl-v2-1', version: 3 },
          extended_fields: { priority_as_keyword: 'high' },
        })
      );
    });

    it('falls back to v1 config when getTemplate returns undefined', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      // v2 library has no match — getTemplate returns undefined
      const getTemplate = jest.fn().mockResolvedValue(undefined);
      const get = jest.fn().mockResolvedValue([
        {
          owner: 'securitySolution',
          templates: [{ key: 'v1_triage', name: 'V1 Triage', caseFields: { title: 'V1 title' } }],
        },
      ]);
      const getCasesClient = jest.fn().mockResolvedValue({
        configure: { get },
        templates: { getTemplate },
        cases: { create },
      } as unknown as CasesClient);
      const definition = createCaseFromTemplateStepDefinition(getCasesClient);

      await definition.handler(
        createContext({ owner: 'securitySolution', case_template_id: 'v1_triage' })
      );

      expect(getTemplate).toHaveBeenCalledWith('v1_triage');
      expect(get).toHaveBeenCalledWith({ owner: 'securitySolution' });
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'V1 title' }));
    });

    it('falls back to v1 when the templates sub-client is unavailable (feature disabled)', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const get = jest.fn().mockResolvedValue([
        {
          owner: 'securitySolution',
          templates: [{ key: 'v1_triage', name: 'V1 Triage', caseFields: { title: 'V1 title' } }],
        },
      ]);
      // casesClient.templates is undefined (templates feature disabled)
      const getCasesClient = jest.fn().mockResolvedValue({
        configure: { get },
        templates: undefined,
        cases: { create },
      } as unknown as CasesClient);
      const definition = createCaseFromTemplateStepDefinition(getCasesClient);

      await definition.handler(
        createContext({ owner: 'securitySolution', case_template_id: 'v1_triage' })
      );

      expect(get).toHaveBeenCalledWith({ owner: 'securitySolution' });
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'V1 title' }));
    });

    it('errors when the matched v2 template belongs to a different owner', async () => {
      const create = jest.fn();
      const getTemplate = jest
        .fn()
        .mockResolvedValue(makeTemplateSO(v2Definition, 'observability'));
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        cases: { create },
      } as unknown as CasesClient);
      const definition = createCaseFromTemplateStepDefinition(getCasesClient);

      const result = await definition.handler(
        createContext({ owner: 'securitySolution', case_template_id: 'tpl-v2-1' })
      );

      expect(create).not.toHaveBeenCalled();
      expect(result.error?.message).toContain('Case template not found');
    });

    it('errors when neither v2 library nor v1 config has the template', async () => {
      const create = jest.fn();
      const getTemplate = jest.fn().mockResolvedValue(undefined);
      const get = jest.fn().mockResolvedValue([{ owner: 'securitySolution', templates: [] }]);
      const getCasesClient = jest.fn().mockResolvedValue({
        configure: { get },
        templates: { getTemplate },
        cases: { create },
      } as unknown as CasesClient);
      const definition = createCaseFromTemplateStepDefinition(getCasesClient);

      const result = await definition.handler(
        createContext({ owner: 'securitySolution', case_template_id: 'missing_template' })
      );

      expect(create).not.toHaveBeenCalled();
      expect(result.error?.message).toContain('Case template not found');
    });
  });
});
