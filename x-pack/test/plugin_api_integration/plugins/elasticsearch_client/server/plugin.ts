/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

export class ElasticsearchClientXPack implements Plugin {
  constructor() {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/elasticsearch_client_xpack/context/user',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, req, res) => {
        const coreContext = await context.core;
        const body = await coreContext.elasticsearch.client.asCurrentUser.security.getUser();
        return res.ok({ body });
      }
    );

    router.get(
      {
        path: '/api/elasticsearch_client_xpack/contract/user',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, req, res) => {
        const [coreStart] = await core.getStartServices();
        const body = await coreStart.elasticsearch.client
          .asScoped(req)
          .asCurrentUser.security.getUser();
        return res.ok({ body });
      }
    );
  }

  public start() {}

  public stop() {}
}
