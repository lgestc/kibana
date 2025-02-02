/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { ReadStreamDefinition, ProcessingDefinition, Condition } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';

type Simulation = APIReturnType<'POST /api/streams/{id}/processing/_simulate'>;

export interface UseProcessingSimulatorReturnType {
  error?: IHttpFetchError<ResponseErrorBody>;
  isLoading: boolean;
  refreshSamples: () => void;
  samples: Array<Record<PropertyKey, unknown>>;
  simulate: (processing: ProcessingDefinition) => Promise<Simulation | null>;
  simulation?: Simulation | null;
}

export const useProcessingSimulator = ({
  definition,
  condition,
}: {
  definition: ReadStreamDefinition;
  condition?: Condition;
}): UseProcessingSimulatorReturnType => {
  const { dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const abortController = useAbortController();

  const serializedCondition = JSON.stringify(condition);

  const {
    loading: isLoadingSamples,
    value: samples,
    refresh: refreshSamples,
  } = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition) {
        return { documents: [] };
      }

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/_sample', {
        signal,
        params: {
          path: { id: definition.name },
          body: {
            condition,
            start: start?.valueOf(),
            end: end?.valueOf(),
            number: 100,
          },
        },
      });
    },
    [definition, streamsRepositoryClient, start, end, serializedCondition],
    { disableToastOnError: true }
  );

  const sampleDocs = (samples?.documents ?? []) as Array<Record<PropertyKey, unknown>>;

  const [{ loading: isLoadingSimulation, error, value }, simulate] = useAsyncFn(
    (processingDefinition: ProcessingDefinition) => {
      if (!definition) {
        return Promise.resolve(null);
      }

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/processing/_simulate', {
        signal: abortController.signal,
        params: {
          path: { id: definition.name },
          body: {
            documents: sampleDocs,
            processing: [processingDefinition],
          },
        },
      });
    },
    [definition, sampleDocs]
  );

  return {
    isLoading: isLoadingSamples || isLoadingSimulation,
    error: error as IHttpFetchError<ResponseErrorBody> | undefined,
    refreshSamples,
    simulate,
    simulation: value,
    samples: sampleDocs,
  };
};
