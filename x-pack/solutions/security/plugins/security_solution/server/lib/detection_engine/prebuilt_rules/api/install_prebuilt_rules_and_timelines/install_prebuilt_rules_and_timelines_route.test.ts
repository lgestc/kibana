/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEmptyFindResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
  getRuleMock,
  getBasicEmptySearchResponse,
} from '../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock } from '../../../routes/__mocks__';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines_route';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { installPrepackagedTimelines } from '../../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getQueryRuleParams } from '../../../rule_schema/mocks';

// eslint-disable-next-line no-restricted-imports
import { legacyCreatePrepackagedRules } from './legacy_create_prepackaged_rules';

jest.mock('../../logic/rule_assets/prebuilt_rule_assets_client', () => {
  return {
    createPrebuiltRuleAssetsClient: () => {
      return {
        fetchLatestAssets: async () => {
          return [
            {
              author: ['Elastic'],
              tags: [],
              rule_id: 'rule-1',
              risk_score: 50,
              risk_score_mapping: [],
              severity_mapping: [],
              description: 'some description',
              from: 'now-5m',
              to: 'now',
              index: ['index-1'],
              name: 'some-name',
              severity: 'low',
              interval: '5m',
              type: 'query',
              query: 'user.name: root or user.name: admin',
              language: 'kuery',
              references: [],
              actions: [],
              enabled: false,
              false_positives: [],
              max_signals: 100,
              threat: [],
              throttle: undefined,
              exceptions_list: [],
              version: 2, // set one higher than the mocks which is set to 1 to trigger updates
            },
          ];
        },
      };
    },
  };
});

jest.mock('../../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines', () => {
  return {
    installPrepackagedTimelines: jest.fn().mockResolvedValue({
      success: true,
      success_count: 3,
      errors: [],
      timelines_installed: 3,
      timelines_updated: 0,
    }),
  };
});

describe('add_prepackaged_rules_route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let mockExceptionsClient: ExceptionListClient;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    mockExceptionsClient = listMock.getExceptionListClient();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 0,
      timelines_installed: 3,
      timelines_updated: 0,
      errors: [],
    });

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    installPrebuiltRulesAndTimelinesRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });

  describe('responses', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 1,
        rules_updated: 0,
        timelines_installed: 3,
        timelines_updated: 0,
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 0,
        rules_updated: 1,
        timelines_installed: 3,
        timelines_updated: 0,
      });
    });
  });

  test('should install prepackaged timelines', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          id: '36429040-b529-11ea-8d8b-21de98be11a6',
          error: {
            message: 'timeline_id: "36429040-b529-11ea-8d8b-21de98be11a6" already exists',
            status_code: 409,
          },
        },
      ],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 0,
    });
  });

  test('should include the result of installing prepackaged timelines - timelines_installed', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 1,
      timelines_installed: 1,
      timelines_updated: 0,
      errors: [],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 1,
      timelines_updated: 0,
    });
  });

  test('should include the result of installing prepackaged timelines - timelines_updated', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 1,
      timelines_installed: 0,
      timelines_updated: 1,
      errors: [],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 1,
    });
  });

  test('should include the result of installing prepackaged timelines - skip the error message', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          id: '36429040-b529-11ea-8d8b-21de98be11a6',
          error: {
            message: 'timeline_id: "36429040-b529-11ea-8d8b-21de98be11a6" already exists',
            status_code: 409,
          },
        },
      ],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 0,
    });
  });

  describe('createPrepackagedRules', () => {
    test('uses exception lists client from context when available', async () => {
      await legacyCreatePrepackagedRules(
        context.securitySolution,
        clients.rulesClient,
        mockExceptionsClient
      );

      expect(mockExceptionsClient.createEndpointList).not.toHaveBeenCalled();
      expect(context.securitySolution.getExceptionListClient).toHaveBeenCalled();
    });

    test('uses passed in exceptions list client when lists client not available in context', async () => {
      context.securitySolution.getExceptionListClient.mockImplementation(() => null);

      await legacyCreatePrepackagedRules(
        context.securitySolution,
        clients.rulesClient,
        mockExceptionsClient
      );

      expect(mockExceptionsClient.createEndpointList).toHaveBeenCalled();
    });
  });
});
