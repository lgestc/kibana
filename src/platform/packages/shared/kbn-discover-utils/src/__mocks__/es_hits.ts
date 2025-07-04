/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { EsHitRecord } from '../types';

export const esHitsMock = [
  {
    _index: 'i',
    _id: '1',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
  },
  {
    _index: 'i',
    _id: '2',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
  },
  {
    _index: 'i',
    _id: '3',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test3', extension: 'gif', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '4',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.125', name: 'test4', extension: 'png', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '5',
    _score: 1,
    _type: '_doc',
    _source: {
      date: '2020-20-01T12:12:12.128',
      name: 'test5',
      extension: 'doc',
      bytes: 50,
      message: '',
    },
  },
];

export const esHitsMockWithSort = esHitsMock.map((hit) => ({
  ...hit,
  sort: [hit._source.date], // some `sort` param should be specified for "fetch more" to work
}));

const baseDate = new Date('2024-01-1').getTime();
const dateInc = 100000000;

const generateFieldValue = (field: DataViewField, index: number) => {
  switch (field.type) {
    case KBN_FIELD_TYPES.BOOLEAN:
      return index % 2 === 0;
    case KBN_FIELD_TYPES.DATE:
      return new Date(baseDate + index * dateInc).toISOString();
    case KBN_FIELD_TYPES.NUMBER:
      return Array.from(field.name).reduce((sum, char) => sum + char.charCodeAt(0) + index, 0);
    case KBN_FIELD_TYPES.STRING:
      return `${field.name}_${index}`;
    case KBN_FIELD_TYPES._SOURCE:
      return { [field.name]: `${field.name}_${index}` };
    default:
      throw new Error(`Unsupported type ${field.type}`);
  }
};

export const generateEsHit = (params: Partial<EsHitRecord> = {}): EsHitRecord => {
  return {
    _index: 'i',
    _id: '1',
    _score: 1,
    fields: {},
    ...params,
  };
};

export const generateEsHits = (dataView: DataView, count: number): EsHitRecord[] => {
  return Array.from({ length: count }, (_, i) =>
    generateEsHit({
      _id: i.toString(),
      fields: dataView.fields.reduce<Record<string, any>>((source, field) => {
        return {
          ...source,
          [field.name]: [generateFieldValue(field, i)],
        };
      }, {}),
    })
  );
};
