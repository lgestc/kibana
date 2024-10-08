/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { resultTitle } from './result_metadata';

const makeSearchHit = (source: undefined | unknown): SearchHit =>
  ({
    _source: source,
  } as SearchHit);

describe('resultTitle', () => {
  it('returns result title if available', () => {
    expect(resultTitle(makeSearchHit({ title: 'test 123' }))).toEqual('test 123');
    expect(resultTitle(makeSearchHit({ name: 'this is a name' }))).toEqual('this is a name');
    expect(resultTitle(makeSearchHit({ name: 'this is a name', title: 'test 123' }))).toEqual(
      'test 123'
    );
    expect(resultTitle(makeSearchHit({ other: 'thing' }))).toEqual(undefined);
    expect(resultTitle(makeSearchHit(undefined))).toEqual(undefined);
  });
});
