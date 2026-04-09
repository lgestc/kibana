/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySystemFieldMappings } from './apply_system_field_mappings';
import type { FieldDefinition } from '../types/domain/template/fields';

const makeStatusField = (
  name: string,
  valueMap: Record<string, 'open' | 'in-progress' | 'closed'>
): FieldDefinition => ({
  name,
  control: 'SELECT_BASIC',
  type: 'keyword',
  system: { maps_to: 'status', value_map: valueMap },
  metadata: { options: Object.keys(valueMap) },
});

const makeUnmappedField = (name: string): FieldDefinition => ({
  name,
  control: 'INPUT_TEXT',
  type: 'keyword',
});

describe('applySystemFieldMappings', () => {
  it('maps a field value to status via value_map', () => {
    const fields = [makeStatusField('state', { new: 'open', wip: 'in-progress', done: 'closed' })];

    expect(applySystemFieldMappings(fields, { state_as_keyword: 'new' })).toEqual({
      status: 'open',
    });
    expect(applySystemFieldMappings(fields, { state_as_keyword: 'wip' })).toEqual({
      status: 'in-progress',
    });
    expect(applySystemFieldMappings(fields, { state_as_keyword: 'done' })).toEqual({
      status: 'closed',
    });
  });

  it('omits status override when raw value is not in value_map', () => {
    const fields = [makeStatusField('state', { new: 'open' })];
    const extendedFields = { state_as_keyword: 'unknown' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when the extended field key is absent', () => {
    const fields = [makeStatusField('state', { new: 'open' })];

    expect(applySystemFieldMappings(fields, {})).toEqual({});
  });

  it('returns empty object when the extended field value is null', () => {
    const fields = [makeStatusField('state', { new: 'open' })];
    const extendedFields = { state_as_keyword: null };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when no fields have system.maps_to', () => {
    const fields = [makeUnmappedField('notes'), makeUnmappedField('effort')];
    const extendedFields = { notes_as_keyword: 'something', effort_as_keyword: '5' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when extendedFields is empty', () => {
    const fields = [makeStatusField('state', { new: 'open' })];

    expect(applySystemFieldMappings(fields, {})).toEqual({});
  });
});
