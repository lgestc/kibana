/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { isRight, isLeft } from 'fp-ts/Either';
import { strictKeysRt } from '.';
import { jsonRt } from '../json_rt';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isoToEpochRt } from '../iso_to_epoch_rt';
import { toBooleanRt } from '../to_boolean_rt';

describe('strictKeysRt', () => {
  it('correctly and deeply validates object keys', () => {
    const timeWindowRt = t.union([
      t.type({ duration: t.string }),
      t.type({ start_time: isoToEpochRt }),
    ]);

    const metricQueryRt = t.union(
      [
        t.type({
          avg_over_time: t.intersection([
            t.type({
              field: t.string,
            }),
            t.partial({
              range: t.string,
            }),
          ]),
        }),
        t.type({
          count_over_time: t.strict({}),
        }),
      ],
      'metric_query'
    );

    const metricExpressionRt = t.type(
      {
        expression: t.string,
      },
      'metric_expression'
    );

    const metricRt = t.intersection([
      t.partial({
        record: t.boolean,
      }),
      t.union([metricQueryRt, metricExpressionRt]),
    ]);

    const metricContainerRt = t.record(t.string, metricRt);

    const groupingRt = t.type(
      {
        by: t.record(
          t.string,
          t.type({
            field: t.string,
          }),
          'by'
        ),
        limit: t.number,
      },
      'grouping'
    );

    const queryRt = t.intersection(
      [
        t.union([groupingRt, t.strict({})]),
        t.type({
          index: t.union([t.string, t.array(t.string)]),
          metrics: metricContainerRt,
        }),
        t.partial({
          filter: t.string,
          round: t.string,
          runtime_mappings: t.string,
          query_delay: t.string,
        }),
      ],
      'query'
    );

    const checks: Array<{ type: t.Type<any>; passes: any[]; fails: any[] }> = [
      {
        type: t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.string })]),
        passes: [{ foo: '' }, { foo: '', bar: '' }],
        fails: [
          { foo: '', unknownKey: '' },
          { foo: '', bar: '', unknownKey: '' },
        ],
      },
      {
        type: t.type({
          path: t.union([t.type({ serviceName: t.string }), t.type({ transactionType: t.string })]),
        }),
        passes: [{ path: { serviceName: '' } }, { path: { transactionType: '' } }],
        fails: [
          { path: { serviceName: '', unknownKey: '' } },
          { path: { transactionType: '', unknownKey: '' } },
          { path: { serviceName: '', transactionType: '' } },
          { path: { serviceName: '' }, unknownKey: '' },
        ],
      },
      {
        type: t.intersection([
          t.type({ query: t.type({ bar: t.string }) }),
          t.partial({ query: t.partial({ _inspect: t.boolean }) }),
        ]),
        passes: [{ query: { bar: '', _inspect: true } }],
        fails: [{ query: { _inspect: true } }],
      },
      {
        type: t.type({
          body: t.intersection([
            t.partial({
              from: t.string,
            }),
            t.type({
              config: t.intersection([
                t.partial({
                  from: t.string,
                }),
                t.type({
                  alert: t.type({}),
                }),
                t.union([
                  t.type({
                    query: queryRt,
                  }),
                  t.type({
                    queries: t.array(queryRt),
                  }),
                ]),
              ]),
            }),
          ]),
        }),
        passes: [
          {
            body: {
              config: {
                alert: {},
                query: {
                  index: ['apm-*'],
                  filter: 'processor.event:transaction',
                  metrics: {
                    avg_latency_1h: {
                      avg_over_time: {
                        field: 'transaction.duration.us',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        fails: [
          {
            body: {
              config: {
                alert: {},
                query: {
                  index: '',
                  metrics: {
                    avg_latency_1h: {
                      avg_over_time: {
                        field: '',
                        range: '',
                      },
                    },
                    rate_1h: {
                      count_over_time: {
                        field: '',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      {
        type: t.type({ body: timeWindowRt }),
        passes: [
          { body: { duration: '1d' } },
          { body: { start_time: '2022-05-20T08:10:15.000Z' } },
        ],
        fails: [
          { body: { duration: '1d', start_time: '2022-05-20T08:10:15.000Z' } },
          { body: { duration: '1d', unknownKey: '' } },
          { body: { start_time: '2022-05-20T08:10:15.000Z', unknownKey: '' } },
          { body: { unknownKey: '' } },
          { body: { start_time: 'invalid' } },
          { body: { duration: false } },
        ],
      },
      {
        type: t.array(t.type({ foo: t.string })),
        passes: [[{ foo: 'bar' }], [{ foo: 'baz' }, { foo: 'bar' }]],
        fails: [{ foo: 'bar', bar: 'foo' }],
      },
      {
        type: t.type({
          nestedArray: t.array(
            t.type({
              bar: t.string,
            })
          ),
        }),
        passes: [
          {
            nestedArray: [],
          },
          {
            nestedArray: [
              {
                bar: 'foo',
              },
            ],
          },
        ],
        fails: [
          {
            nestedArray: [
              {
                bar: 'foo',
                foo: 'bar',
              },
            ],
          },
        ],
      },
    ];

    checks.forEach((check) => {
      const { type, passes, fails } = check;

      const strictType = strictKeysRt(type);

      passes.forEach((value) => {
        const result = strictType.decode(value);

        if (!isRight(result)) {
          throw new Error(
            `Expected ${JSON.stringify(
              value
            )} to be allowed, but validation failed with ${PathReporter.report(result).join('\n')}`
          );
        }
      });

      fails.forEach((value) => {
        const result = strictType.decode(value);

        if (!isLeft(result)) {
          throw new Error(
            `Expected ${JSON.stringify(value)} to be disallowed, but validation succeeded`
          );
        }
      });
    });
  });

  it('deals with union types', () => {
    const type = t.intersection([
      t.type({
        required: t.string,
      }),
      t.partial({
        disable: t.union([
          toBooleanRt,
          t.type({
            except: t.array(t.string),
          }),
        ]),
      }),
    ]);

    const value = {
      required: 'required',
      disable: {
        except: ['foo'],
      },
    };

    const asStrictType = strictKeysRt(type);

    expect(isRight(asStrictType.decode(value))).toBe(true);
  });

  it('does not support piped types', () => {
    const typeA = t.type({
      query: t.type({ filterNames: jsonRt.pipe(t.array(t.string)) }),
    } as Record<string, any>);

    const typeB = t.partial({
      query: t.partial({ _inspect: jsonRt.pipe(t.boolean) }),
    });

    const value = {
      query: {
        _inspect: 'true',
        filterNames: JSON.stringify(['host', 'agentName']),
      },
    };

    const pipedType = strictKeysRt(typeA.pipe(typeB));

    expect(isLeft(pipedType.decode(value))).toBe(true);
  });
});
