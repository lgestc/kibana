/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { IRouter, Logger } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataUsageTracker } from '../usage/usage';
import { getSampleDataInstaller, SAMPLE_DATA_INSTALLED_EVENT } from './utils';
import { SampleDataInstallError } from '../errors';

export function createInstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker,
  analytics: AnalyticsServiceSetup
): void {
  router.post(
    {
      path: '/api/sample_data/{id}',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because the sample data installer is a wrapper around the Saved Object client',
        },
      },
      validate: {
        params: schema.object({ id: schema.string() }),
        // TODO validate now as date
        query: schema.object({ now: schema.maybe(schema.string()) }),
      },
    },
    async (context, req, res) => {
      const routeStartTime = performance.now();
      const { params, query } = req;
      const sampleDataset = sampleDatasets.find(({ id }) => id === params.id);
      if (!sampleDataset) {
        return res.notFound();
      }

      //  @ts-ignore Custom query validation used
      const now = query.now ? new Date(query.now) : new Date();

      const sampleDataInstaller = await getSampleDataInstaller({
        datasetId: sampleDataset.id,
        sampleDatasets,
        logger,
        context,
      });

      try {
        const installResult = await sampleDataInstaller.install(params.id, now);
        // track the usage operation in a non-blocking way
        usageTracker.addInstall(params.id);

        reportPerformanceMetricEvent(analytics, {
          eventName: SAMPLE_DATA_INSTALLED_EVENT,
          duration: performance.now() - routeStartTime,
          key1: params.id,
        });
        return res.ok({
          body: {
            elasticsearchIndicesCreated: installResult.createdDocsPerIndex,
            kibanaSavedObjectsLoaded: installResult.createdSavedObjects,
          },
        });
      } catch (e) {
        if (e instanceof SampleDataInstallError) {
          return res.customError({
            body: {
              message: e.message,
            },
            statusCode: e.httpCode,
          });
        }
        throw e;
      }
    }
  );
}
