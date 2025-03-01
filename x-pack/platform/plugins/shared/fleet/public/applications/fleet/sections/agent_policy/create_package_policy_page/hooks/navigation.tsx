/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';

import { PLUGIN_ID, INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { pkgKeyFromPackageInfo } from '../../../../services';
import { useStartServices, useLink, useIntraAppState } from '../../../../hooks';
import type {
  CreatePackagePolicyRouteState,
  PackagePolicy,
  OnSaveQueryParamKeys,
} from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';

import { appendOnSaveQueryParamsToPath } from '../utils';

interface UseCancelParams {
  from: EditPackagePolicyFrom;
  pkgkey: string;
  agentPolicyId?: string;
}

export const useCancelAddPackagePolicy = (params: UseCancelParams) => {
  const { from, pkgkey, agentPolicyId } = params;
  const {
    application: { navigateToApp },
  } = useStartServices();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const { getHref } = useLink();

  const cancelClickHandler = useCallback(
    (ev: React.SyntheticEvent) => {
      if (routeState?.onCancelNavigateTo) {
        ev.preventDefault();
        navigateToApp(...routeState.onCancelNavigateTo);
      }
    },
    [routeState, navigateToApp]
  );

  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }
    return from === 'policy' && agentPolicyId
      ? getHref('policy_details', {
          policyId: agentPolicyId,
        })
      : getHref('integration_details_overview', { pkgkey });
  }, [routeState, from, agentPolicyId, getHref, pkgkey]);

  return { cancelClickHandler, cancelUrl };
};

interface UseOnSaveNavigateParams {
  routeState?: CreatePackagePolicyRouteState;
  queryParamsPolicyId?: string;
}

export const useOnSaveNavigate = (params: UseOnSaveNavigateParams) => {
  const { queryParamsPolicyId } = params;
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const doOnSaveNavigation = useRef<boolean>(true);
  const { getPath } = useLink();

  const {
    application: { navigateToApp },
  } = useStartServices();

  // Detect if user left page
  useEffect(() => {
    return () => {
      doOnSaveNavigation.current = false;
    };
  }, []);

  const onSaveNavigate = useCallback(
    (policy: PackagePolicy, paramsToApply: OnSaveQueryParamKeys[] = []) => {
      if (!doOnSaveNavigation.current) {
        return;
      }
      const hasNoAgentPolicies = policy.policy_ids.length === 0;
      const packagePolicyPath =
        hasNoAgentPolicies || policy.supports_agentless
          ? getPath('integration_details_policies', {
              pkgkey: pkgKeyFromPackageInfo(policy.package!),
            })
          : getPath('policy_details', {
              policyId: policy.policy_ids[0], // TODO navigates to first policy
            });
      const [onSaveNavigateTo, onSaveQueryParams]: [
        Parameters<ApplicationStart['navigateToApp']>,
        CreatePackagePolicyRouteState['onSaveQueryParams']
      ] = routeState?.onSaveNavigateTo
        ? [routeState.onSaveNavigateTo, routeState?.onSaveQueryParams]
        : [
            [
              hasNoAgentPolicies || policy.supports_agentless ? INTEGRATIONS_PLUGIN_ID : PLUGIN_ID,
              {
                path: packagePolicyPath,
              },
            ],
            {
              showAddAgentHelp: true,
              openEnrollmentFlyout: true,
            },
          ];

      const [appId, options] = onSaveNavigateTo;
      if (options?.path) {
        const pathWithQueryString = appendOnSaveQueryParamsToPath({
          // In cases where we want to navigate back to a new/existing policy, we need to override the initial `path`
          // value and navigate to the actual agent policy instead
          path: queryParamsPolicyId ? packagePolicyPath : options.path,
          policy,
          mappingOptions: onSaveQueryParams,
          paramsToApply,
        });
        navigateToApp(appId, { ...options, path: pathWithQueryString });
      } else {
        navigateToApp(...onSaveNavigateTo);
      }
    },
    [
      getPath,
      routeState?.onSaveNavigateTo,
      routeState?.onSaveQueryParams,
      queryParamsPolicyId,
      navigateToApp,
    ]
  );

  return onSaveNavigate;
};
