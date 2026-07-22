/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows';
import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';
import { getCaseConfigure } from '../containers/configure/api';
import { KibanaServices } from '../common/lib/kibana';
import type { Owner } from '../../common/bundled-types.gen';
import type { CasesConfigurationUI } from '../../common/ui';
import type { TemplateListItem } from '../../common/types/api/template/v1';

jest.mock('../containers/configure/api', () => ({
  getCaseConfigure: jest.fn(),
}));

jest.mock('../common/lib/kibana', () => ({
  KibanaServices: {
    get: jest.fn(),
  },
}));

describe('createCreateCaseFromTemplateStepDefinition', () => {
  const getCaseConfigureMock = jest.mocked(getCaseConfigure);
  const httpFetchMock = jest.fn();

  beforeEach(() => {
    jest.mocked(KibanaServices.get).mockReturnValue({
      http: { fetch: httpFetchMock },
    } as unknown as ReturnType<typeof KibanaServices.get>);
  });

  const createSelectionContext = (owner?: Owner | string) => ({
    stepType: 'cases.createCaseFromTemplate' as const,
    scope: 'input' as const,
    propertyKey: 'case_template_id',
    values: {
      input: owner === undefined ? {} : { owner },
    },
  });

  /** Helpers to build fixture data */
  const makeV1Configure = (
    owner: string,
    templates: Array<{ key: string; name: string; description?: string }>
  ): CasesConfigurationUI =>
    ({
      owner,
      templates: templates.map((t) => ({ ...t, caseFields: {} })),
    } as unknown as CasesConfigurationUI);

  const makeV2Template = (
    templateId: string,
    name: string,
    description?: string,
    owner = 'securitySolution'
  ): TemplateListItem =>
    ({
      templateId,
      name,
      description,
      owner,
      definition: '',
      templateVersion: 1,
      deletedAt: null,
      fieldSearchMatches: false,
    } as TemplateListItem);

  const mockV2Response = (templates: TemplateListItem[]) => {
    httpFetchMock.mockResolvedValue({ templates, page: 1, perPage: 100, total: templates.length });
  };

  interface SelectionHandler {
    search: (input: string, context: unknown) => Promise<SelectionOption<string>[]>;
    resolve: (value: string, context: unknown) => Promise<SelectionOption | null>;
    getDetails: (value: string, context: unknown, option: unknown) => Promise<{ message: string }>;
  }

  const setup = ({
    v1Configure = [] as CasesConfigurationUI[],
    v2Templates = [] as TemplateListItem[],
    isTemplatesEnabled = true,
  } = {}) => {
    getCaseConfigureMock.mockResolvedValue(v1Configure);
    mockV2Response(v2Templates);

    const definition = createCreateCaseFromTemplateStepDefinition(isTemplatesEnabled);
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;

    return {
      definition,
      templateSelection: inputHandlers.case_template_id.selection,
    };
  };

  afterEach(() => {
    getCaseConfigureMock.mockReset();
    httpFetchMock.mockReset();
  });

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.createCaseFromTemplate');
    expect(definition.category).toBe('kibana.cases');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  describe('template listing — v2 first, v1 deprecated', () => {
    it('returns v2 templates before v1 templates with v1 options marked deprecated', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [{ key: 'v1_triage', name: 'V1 Triage' }]),
        ],
        v2Templates: [makeV2Template('v2-tpl-1', 'V2 Triage')],
      });

      const results = await templateSelection!.search(
        '',
        createSelectionContext('securitySolution')
      );

      expect(results).toEqual([
        { value: 'v2-tpl-1', label: 'V2 Triage', description: undefined },
        { value: 'v1_triage', label: 'V1 Triage', description: undefined, deprecated: true },
      ]);
    });

    it('matches search query against both v2 templateId/name and v1 key/name', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [{ key: 'v1_triage', name: 'V1 Triage' }]),
        ],
        v2Templates: [makeV2Template('v2-tpl-1', 'V2 Triage')],
      });

      const byName = await templateSelection!.search(
        'triage',
        createSelectionContext('securitySolution')
      );
      expect(byName).toHaveLength(2);

      const byV2Id = await templateSelection!.search(
        'v2-tpl',
        createSelectionContext('securitySolution')
      );
      expect(byV2Id).toEqual([{ value: 'v2-tpl-1', label: 'V2 Triage', description: undefined }]);

      const byV1Key = await templateSelection!.search(
        'v1_triage',
        createSelectionContext('securitySolution')
      );
      expect(byV1Key).toEqual([
        {
          value: 'v1_triage',
          label: 'V1 Triage',
          description: undefined,
          deprecated: true,
        },
      ]);
    });

    it('resolves a v2 id to a non-deprecated option', async () => {
      const { templateSelection } = setup({
        v2Templates: [makeV2Template('v2-tpl-1', 'V2 Triage', 'A v2 desc')],
      });

      const resolved = await templateSelection!.resolve(
        'v2-tpl-1',
        createSelectionContext('securitySolution')
      );
      expect(resolved).toEqual({ value: 'v2-tpl-1', label: 'V2 Triage', description: 'A v2 desc' });
    });

    it('resolves a v1 key to a deprecated option', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [
            { key: 'v1_triage', name: 'V1 Triage', description: 'A v1 desc' },
          ]),
        ],
      });

      const resolved = await templateSelection!.resolve(
        'v1_triage',
        createSelectionContext('securitySolution')
      );
      expect(resolved).toEqual({
        value: 'v1_triage',
        label: 'V1 Triage',
        description: 'A v1 desc',
        deprecated: true,
      });
    });

    it('does not fetch v2 templates when isTemplatesEnabled is false', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [{ key: 'v1_triage', name: 'V1 Triage' }]),
        ],
        v2Templates: [makeV2Template('v2-tpl-1', 'V2 Triage')],
        isTemplatesEnabled: false,
      });

      const results = await templateSelection!.search(
        '',
        createSelectionContext('securitySolution')
      );

      // v2 should not appear; httpFetch not called
      expect(httpFetchMock).not.toHaveBeenCalled();
      expect(results).toEqual([
        { value: 'v1_triage', label: 'V1 Triage', description: undefined, deprecated: true },
      ]);
    });
  });

  describe('backward-compat — v1-only behaviour when templates feature is off', () => {
    it('returns all v1 templates when query is empty and isTemplatesEnabled is false', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [
            {
              key: 'triage_template',
              name: 'Triage template',
              description: 'Default triage template',
            },
            {
              key: 'investigation_template',
              name: 'Investigation template',
              description: 'Investigation defaults',
            },
          ]),
        ],
        isTemplatesEnabled: false,
      });

      const results = await templateSelection!.search(
        '   ',
        createSelectionContext('securitySolution')
      );

      expect(results).toEqual([
        {
          value: 'triage_template',
          label: 'Triage template',
          description: 'Default triage template',
          deprecated: true,
        },
        {
          value: 'investigation_template',
          label: 'Investigation template',
          description: 'Investigation defaults',
          deprecated: true,
        },
      ]);
    });

    it('returns at most 15 templates in browse mode', async () => {
      const manyTemplates = Array.from({ length: 16 }, (_, i) => ({
        key: `template_${i}`,
        name: `Template ${i}`,
        description: `Description ${i}`,
      }));

      const { templateSelection } = setup({
        v1Configure: [makeV1Configure('securitySolution', manyTemplates)],
        isTemplatesEnabled: false,
      });

      const results = await templateSelection!.search(
        '',
        createSelectionContext('securitySolution')
      );

      expect(results).toHaveLength(15);
    });

    it('finds a template beyond the first 15 when query is non-empty', async () => {
      const manyTemplates = [
        ...Array.from({ length: 15 }, (_, i) => ({ key: `tmpl_${i}`, name: `Plain ${i}` })),
        { key: 'only_uniquetail', name: 'Only uniquetail template', description: 'Last' },
      ];

      const { templateSelection } = setup({
        v1Configure: [makeV1Configure('securitySolution', manyTemplates)],
        isTemplatesEnabled: false,
      });

      const results = await templateSelection!.search(
        'uniquetail',
        createSelectionContext('securitySolution')
      );

      expect(results).toEqual([
        {
          value: 'only_uniquetail',
          label: 'Only uniquetail template',
          description: 'Last',
          deprecated: true,
        },
      ]);
    });
  });

  describe('owner filtering', () => {
    it('returns no options when owner is invalid', async () => {
      const { templateSelection } = setup();

      await expect(
        templateSelection!.search('triage', createSelectionContext('notAValidOwner'))
      ).resolves.toEqual([]);
      expect(getCaseConfigureMock).not.toHaveBeenCalled();
      expect(httpFetchMock).not.toHaveBeenCalled();
    });

    it('returns no options when owner is empty', async () => {
      const { templateSelection } = setup();

      await expect(
        templateSelection!.search('triage', createSelectionContext(''))
      ).resolves.toEqual([]);
      await expect(templateSelection!.search('triage', createSelectionContext())).resolves.toEqual(
        []
      );
      expect(getCaseConfigureMock).not.toHaveBeenCalled();
    });

    it('does not return observability v1 templates when input owner is securitySolution', async () => {
      const { templateSelection } = setup({
        v1Configure: [
          makeV1Configure('securitySolution', [{ key: 'sec_tpl', name: 'Sec template' }]),
          makeV1Configure('observability', [{ key: 'obs_tpl', name: 'Obs template' }]),
        ],
        isTemplatesEnabled: false,
      });

      await expect(
        templateSelection!.search('obs', createSelectionContext('securitySolution'))
      ).resolves.toEqual([]);
    });
  });

  describe('getDetails', () => {
    it('returns "can be used" when option is resolved', async () => {
      const { templateSelection } = setup();

      const result = await templateSelection!.getDetails(
        'triage_template',
        {
          stepType: 'cases.createCaseFromTemplate',
          scope: 'input',
          propertyKey: 'case_template_id',
        },
        { value: 'triage_template', label: 'Triage template' }
      );
      expect(result.message).toContain('can be used');
    });

    it('returns "was not found" when option is null', async () => {
      const { templateSelection } = setup();

      const result = await templateSelection!.getDetails(
        'missing_template',
        {
          stepType: 'cases.createCaseFromTemplate',
          scope: 'input',
          propertyKey: 'case_template_id',
        },
        null
      );
      expect(result.message).toContain('was not found');
    });
  });

  it('propagates API errors', async () => {
    const error = new Error('configure fetch failed');
    const { templateSelection } = setup({ isTemplatesEnabled: false });
    getCaseConfigureMock.mockRejectedValueOnce(error);

    await expect(
      templateSelection!.search('triage', createSelectionContext('securitySolution'))
    ).rejects.toThrow(error.message);
  });
});
