/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { skip } from 'rxjs';

import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import { dataService } from '../../services/kibana_services';
import type { DashboardApi, DashboardCreationOptions } from '../..';
import { newSession$ } from './new_session';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { DashboardInternalApi } from '../types';

/**
 * Enables dashboard search sessions.
 */
export function startDashboardSearchSessionIntegration(
  dashboardApi: DashboardApi,
  dashboardInternalApi: DashboardInternalApi,
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  setSearchSessionId: (searchSessionId: string) => void
) {
  if (!searchSessionSettings) return;

  const {
    sessionIdUrlChangeObservable,
    getSearchSessionIdFromURL,
    removeSessionIdFromUrl,
    createSessionRestorationDataProvider,
  } = searchSessionSettings;

  dataService.search.session.enableStorage(
    createSessionRestorationDataProvider(dashboardApi, dashboardInternalApi),
    {
      isDisabled: () =>
        getDashboardCapabilities().storeSearchSession
          ? { disabled: false }
          : {
              disabled: true,
              reasonText: noSearchSessionStorageCapabilityMessage,
            },
    }
  );

  // force refresh when the session id in the URL changes. This will also fire off the "handle search session change" below.
  const searchSessionIdChangeSubscription = sessionIdUrlChangeObservable
    ?.pipe(skip(1))
    .subscribe(() => dashboardApi.forceRefresh());

  const newSessionSubscription = newSession$(dashboardApi).subscribe(() => {
    const currentSearchSessionId = dashboardApi.searchSessionId$.value;

    const updatedSearchSessionId: string | undefined = (() => {
      let searchSessionIdFromURL = getSearchSessionIdFromURL();
      if (searchSessionIdFromURL) {
        if (
          dataService.search.session.isRestore() &&
          dataService.search.session.isCurrentSession(searchSessionIdFromURL)
        ) {
          // we had previously been in a restored session but have now changed state so remove the session id from the URL.
          removeSessionIdFromUrl();
          searchSessionIdFromURL = undefined;
        } else {
          dataService.search.session.restore(searchSessionIdFromURL);
        }
      }
      return searchSessionIdFromURL ?? dataService.search.session.start();
    })();

    if (updatedSearchSessionId && updatedSearchSessionId !== currentSearchSessionId) {
      setSearchSessionId(updatedSearchSessionId);
    }
  });

  return () => {
    searchSessionIdChangeSubscription?.unsubscribe();
    newSessionSubscription.unsubscribe();
  };
}
