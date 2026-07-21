/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows';
import { setExtendedFieldStepDefinition } from './set_extended_field';
import { KibanaServices } from '../common/lib/kibana';
import type { Owner } from '../../common/bundled-types.gen';

jest.mock('../common/lib/kibana', () => ({
  KibanaServices: { get: jest.fn() },
}));

describe('setExtendedFieldStepDefinition', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    (KibanaServices.get as jest.Mock).mockReturnValue({ http: { fetch: fetchMock } });
    fetchMock.mockResolvedValue({
      fields: [
        {
          key: 'priority_as_keyword',
          name: 'priority',
          label: 'Priority',
          type: 'keyword',
          control: 'SELECT_BASIC',
          required: false,
          requiredOnClose: false,
          displayOnly: false,
          source: 'global',
          isGlobal: true,
        },
        {
          key: 'instructions_as_keyword',
          name: 'instructions',
          label: 'Instructions',
          type: 'keyword',
          control: 'MARKDOWN',
          required: false,
          requiredOnClose: false,
          displayOnly: true,
          source: 'global',
          isGlobal: true,
        },
      ],
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  interface SelectionHandler {
    search: (input: string, context: unknown) => Promise<SelectionOption<string>[]>;
    resolve: (value: string, context: unknown) => Promise<SelectionOption | null>;
    getDetails: (value: string, context: unknown, option: unknown) => Promise<{ message: string }>;
  }

  const fieldKeySelection = () =>
    (
      (setExtendedFieldStepDefinition.editorHandlers?.input ?? {}) as Record<
        string,
        { selection?: SelectionHandler }
      >
    ).field_key?.selection;

  const context = (owner?: Owner | string) => ({
    stepType: 'cases.setExtendedField' as const,
    scope: 'input' as const,
    propertyKey: 'field_key',
    values: { input: owner === undefined ? {} : { owner } },
  });

  it('has the expected metadata', () => {
    expect(setExtendedFieldStepDefinition.id).toBe('cases.setExtendedField');
    expect(setExtendedFieldStepDefinition.category).toBe('kibana.cases');
  });

  it('searches writable fields and excludes display-only ones', async () => {
    const results = await fieldKeySelection()!.search('', context('securitySolution'));

    expect(fetchMock).toHaveBeenCalledWith('/api/cases/fields', {
      method: 'GET',
      query: { owner: 'securitySolution' },
    });
    expect(results).toEqual([
      { value: 'priority_as_keyword', label: 'Priority', description: 'keyword' },
    ]);
  });

  it('resolves a known field key', async () => {
    const resolved = await fieldKeySelection()!.resolve(
      'priority_as_keyword',
      context('securitySolution')
    );
    expect(resolved).toEqual({
      value: 'priority_as_keyword',
      label: 'Priority',
      description: 'keyword',
    });
  });

  it('returns no options and does not call the API for an invalid owner', async () => {
    await expect(fieldKeySelection()!.search('p', context('notAnOwner'))).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns detail messages for resolved and unresolved keys', async () => {
    const resolved = await fieldKeySelection()!.getDetails('priority_as_keyword', context(), {
      value: 'priority_as_keyword',
      label: 'Priority',
    });
    const unresolved = await fieldKeySelection()!.getDetails('nope_as_keyword', context(), null);

    expect(resolved.message).toContain('can be updated');
    expect(unresolved.message).toContain('was not found');
  });
});
