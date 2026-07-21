/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { setExtendedFieldStepDefinition } from './set_extended_field';
import type { CasesClient } from '../../client';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.setExtendedField' });

describe('setExtendedFieldStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    owner: 'securitySolution',
    field_key: 'priority_as_keyword',
    value: 'high',
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = setExtendedFieldStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.setExtendedField');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('writes the extended field via the client update path and returns the updated case', async () => {
    const updatedCase = {
      ...createCaseResponseFixture,
      extended_fields: { priority_as_keyword: 'high' },
    };
    const get = jest
      .fn()
      .mockResolvedValueOnce(createCaseResponseFixture)
      .mockResolvedValueOnce(updatedCase);
    const bulkUpdate = jest.fn().mockResolvedValue([updatedCase]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    // Routes through bulkUpdate (which records the extended_fields user action), not a raw SO write.
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: createCaseResponseFixture.version,
          extended_fields: { priority_as_keyword: 'high' },
        },
      ],
    });
    expect(get).toHaveBeenNthCalledWith(2, { id: 'case-1', includeComments: false });
    // The step returns the re-fetched case. `extended_fields` is written (asserted above) but is not
    // yet part of the workflow output schema (CaseResponseProperties) — that is added in the docs
    // follow-up PR — so the parsed output case does not surface it here.
    expect((result as { output: { case: { id: string } } }).output.case.id).toBe('case-1');
  });

  it('uses provided version without a pre-update fetch', async () => {
    const updatedCase = {
      ...createCaseResponseFixture,
      extended_fields: { priority_as_keyword: 'high' },
    };
    const get = jest.fn().mockResolvedValue(updatedCase);
    const bulkUpdate = jest.fn().mockResolvedValue([updatedCase]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldStepDefinition(getCasesClient);

    await definition.handler(createContext({ ...input, version: 'provided-version' }));

    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: 'provided-version',
          extended_fields: { priority_as_keyword: 'high' },
        },
      ],
    });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('returns a translated error when the update throws', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockRejectedValue(new Error('update failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Extended field "priority_as_keyword" on case "case-1" could not be updated.',
      })
    );
  });
});
