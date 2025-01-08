/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { StatItems } from '../../../../components/stat_items';
import { KpiBaseComponent } from '../../../../components/kpi';
import { kpiTotalUsersMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_metric';
import { kpiTotalUsersAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_area';
import * as i18n from './translations';
import type { UsersKpiProps } from '../types';

const ID = 'TotalUsersKpiQuery';

const TotalUsersKpiComponent: React.FC<UsersKpiProps> = ({ from, to }) => {
  // NOTE: it's important to have the euiPalette functions called during component render
  // so that the colors can be sourced from the EuiProvider.
  // That's why the below variables are moved inside the function component scope.
  const usersStatItems: Readonly<StatItems[]> = useMemo(() => {
    const euiVisColorPalette = euiPaletteColorBlind();
    const euiColorVis1 = euiVisColorPalette[1];

    return [
      {
        key: 'users',
        fields: [
          {
            key: 'users',
            color: euiColorVis1,
            icon: 'storage',
            lensAttributes: kpiTotalUsersMetricLensAttributes,
          },
        ],
        enableAreaChart: true,
        description: i18n.USERS,
        areaChartLensAttributes: kpiTotalUsersAreaLensAttributes,
      },
    ];
  }, []);

  return <KpiBaseComponent id={ID} statItems={usersStatItems} from={from} to={to} />;
};

export const TotalUsersKpi = React.memo(TotalUsersKpiComponent);
