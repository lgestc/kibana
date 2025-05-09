/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { DefaultListArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getListArrayMock } from '../lists/index.mock';

describe('lists_default_array', () => {
  test('it should return a default array when null', () => {
    const payload = null;
    const decoded = DefaultListArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });

  test('it should return a default array when undefined', () => {
    const payload = undefined;
    const decoded = DefaultListArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });

  test('it should validate an empty array', () => {
    const payload: string[] = [];
    const decoded = DefaultListArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of lists', () => {
    const payload = getListArrayMock();
    const decoded = DefaultListArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array of non accepted types', () => {
    // Terrible casting for purpose of tests
    const payload = [1] as unknown;
    const decoded = DefaultListArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "DefaultListArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
