/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { TIME_SERIES_METRIC_TYPES } from '@kbn/ml-agg-utils';
import {
  type Field,
  type NewJobCaps,
  type RollupFields,
  mlJobAggregations,
  mlJobAggregationsWithoutEsEquivalent,
} from '@kbn/ml-anomaly-utils';
import { combineFieldsAndAggs } from '../../../../common/util/fields_utils';
import { rollupServiceProvider } from './rollup';

const supportedTypes: string[] = [
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.UNSIGNED_LONG,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.GEO_POINT,
  ES_FIELD_TYPES.GEO_SHAPE,
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.VERSION,
];

export function fieldServiceProvider(
  indexPattern: string,
  isRollup: boolean,
  client: IScopedClusterClient,
  dataViewsService: DataViewsService
) {
  return new FieldsService(indexPattern, isRollup, client, dataViewsService);
}

class FieldsService {
  private _indexPattern: string;
  private _isRollup: boolean;
  private _mlClusterClient: IScopedClusterClient;
  private _dataViewsService: DataViewsService;

  constructor(
    indexPattern: string,
    isRollup: boolean,
    client: IScopedClusterClient,
    dataViewsService: DataViewsService
  ) {
    this._indexPattern = indexPattern;
    this._isRollup = isRollup;
    this._mlClusterClient = client;
    this._dataViewsService = dataViewsService;
  }

  private async loadFieldCaps() {
    return await this._mlClusterClient.asCurrentUser.fieldCaps(
      {
        index: this._indexPattern,
        fields: '*',
      },
      { maxRetries: 0 }
    );
  }

  // create field object from the results from _field_caps
  private async createFields(includeNested: boolean = false): Promise<Field[]> {
    const fieldCaps = await this.loadFieldCaps();
    const fields: Field[] = [];
    if (fieldCaps && fieldCaps.fields) {
      Object.keys(fieldCaps.fields).forEach((k) => {
        const fc = fieldCaps.fields[k];
        const firstKey = Object.keys(fc)[0];
        if (firstKey !== undefined) {
          const field = fc[firstKey];
          // add to the list of fields if the field type can be used by ML
          if (
            (supportedTypes.includes(field.type) === true && field.metadata_field !== true) ||
            (includeNested && field.type === ES_FIELD_TYPES.NESTED)
          ) {
            fields.push({
              id: k,
              name: k,
              type: field.type as ES_FIELD_TYPES,
              aggregatable: this.isFieldAggregatable(field),
              counter: this.isCounterField(field),
              aggs: [],
            });
          }
        }
      });
    }
    return fields.sort((a, b) => a.id.localeCompare(b.id));
  }

  private isCounterField(field: estypes.FieldCapsFieldCapability) {
    return field.time_series_metric === TIME_SERIES_METRIC_TYPES.COUNTER;
  }
  // check to see whether the field is aggregatable
  // If it is a counter field from a time series data stream, we cannot currently
  // support any aggregations and so it cannot be used as a field_name in a detector.
  private isFieldAggregatable(field: estypes.FieldCapsFieldCapability) {
    return field.aggregatable && this.isCounterField(field) === false;
  }

  // public function to load fields from _field_caps and create a list
  // of aggregations and fields that can be used for an ML job
  // if the index is a rollup, the fields and aggs will be filtered
  // based on what is available in the rollup job
  // the _indexPattern will be replaced with a comma separated list
  // of index patterns from all of the rollup jobs
  public async getData(includeNested: boolean = false): Promise<NewJobCaps> {
    let rollupFields: RollupFields = Object.create(null);

    if (this._isRollup) {
      const rollupService = await rollupServiceProvider(
        this._indexPattern,
        this._mlClusterClient,
        this._dataViewsService
      );
      const rollupConfigs: estypes.RollupGetRollupCapsRollupCapabilitySummary[] | null =
        await rollupService.getRollupJobs();

      // if a rollup index has been specified, yet there are no
      // rollup configs, return with no results
      if (rollupConfigs === null) {
        return {
          aggs: [],
          fields: [],
        };
      } else {
        rollupFields = combineAllRollupFields(rollupConfigs);
        this._indexPattern = rollupService.getIndexPattern();
      }
    }

    const aggs = cloneDeep([...mlJobAggregations, ...mlJobAggregationsWithoutEsEquivalent]);
    const fields: Field[] = await this.createFields(includeNested);

    return combineFieldsAndAggs(fields, aggs, rollupFields);
  }
}

function combineAllRollupFields(
  rollupConfigs: estypes.RollupGetRollupCapsRollupCapabilitySummary[]
): RollupFields {
  const rollupFields: RollupFields = Object.create(null);
  rollupConfigs.forEach((conf) => {
    Object.keys(conf.fields).forEach((fieldName) => {
      if (rollupFields[fieldName] === undefined) {
        // @ts-expect-error fix type. our RollupFields type is better
        rollupFields[fieldName] = conf.fields[fieldName];
      } else {
        const aggs = conf.fields[fieldName];
        aggs.forEach((agg) => {
          if (rollupFields[fieldName].find((f) => f.agg === agg.agg) === null) {
            // @ts-expect-error TODO: fix after elasticsearch-js bump
            rollupFields[fieldName].push(agg);
          }
        });
      }
    });
  });
  return rollupFields;
}
