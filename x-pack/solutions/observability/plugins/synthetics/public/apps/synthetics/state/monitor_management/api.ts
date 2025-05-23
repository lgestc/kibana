/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ProjectAPIKeyResponse } from '../../../../../server/routes/monitor_cruds/get_api_key';
import { apiService } from '../../../../utils/api_service';
import {
  EncryptedSyntheticsMonitor,
  SyntheticsMonitor,
  ServiceLocationErrorsResponse,
  SyntheticsMonitorWithId,
} from '../../../../../common/runtime_types';
import { INITIAL_REST_VERSION, SYNTHETICS_API_URLS } from '../../../../../common/constants';

export type UpsertMonitorResponse = ServiceLocationErrorsResponse | SyntheticsMonitorWithId;

export const createMonitorAPI = async ({
  monitor,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
}): Promise<UpsertMonitorResponse> => {
  return await apiService.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, monitor, null, {
    version: INITIAL_REST_VERSION,
    internal: true,
  });
};

export interface MonitorInspectResponse {
  publicConfigs: any[];
  privateConfig: PackagePolicy | null;
}

export const inspectMonitorAPI = async ({
  monitor,
  hideParams,
}: {
  hideParams?: boolean;
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
}): Promise<{ result: MonitorInspectResponse; decodedCode: string }> => {
  return await apiService.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_INSPECT, monitor, undefined, {
    hideParams,
  });
};

export const updateMonitorAPI = async ({
  monitor,
  id,
  spaceId,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
  spaceId?: string;
  id: string;
}): Promise<UpsertMonitorResponse> => {
  return await apiService.put(`${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${id}`, monitor, null, {
    spaceId,
    internal: true,
    version: INITIAL_REST_VERSION,
  });
};

export const fetchProjectAPIKey = async (
  accessToElasticManagedLocations: boolean,
  spaces: string[]
): Promise<ProjectAPIKeyResponse> => {
  return await apiService.get(SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY, {
    accessToElasticManagedLocations,
    spaces: JSON.stringify(spaces),
  });
};

export const deletePackagePolicy = async (
  packagePolicyId: string
): Promise<{
  apiKey: { encoded: string };
}> => {
  return await apiService.delete(
    SYNTHETICS_API_URLS.DELETE_PACKAGE_POLICY.replace('{packagePolicyId}', packagePolicyId)
  );
};
