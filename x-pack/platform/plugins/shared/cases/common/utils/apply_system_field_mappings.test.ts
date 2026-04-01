/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySystemFieldMappings } from './apply_system_field_mappings';
import type { FieldDefinition } from '../types/domain/template/fields';

const makeTextField = (
  name: string,
  mapsTo: 'title' | 'description' | 'category'
): FieldDefinition => ({
  name,
  control: 'INPUT_TEXT',
  type: 'keyword',
  system: { maps_to: mapsTo },
});

const makeSeverityField = (
  name: string,
  valueMap: Record<string, 'low' | 'medium' | 'high' | 'critical'>
): FieldDefinition => ({
  name,
  control: 'SELECT_BASIC',
  type: 'keyword',
  system: { maps_to: 'severity', value_map: valueMap },
  metadata: { options: Object.keys(valueMap) },
});

const makeUnmappedField = (name: string): FieldDefinition => ({
  name,
  control: 'INPUT_TEXT',
  type: 'keyword',
});

describe('applySystemFieldMappings', () => {
  it('maps a text field value to the system title field', () => {
    const fields = [makeTextField('case_name', 'title')];
    const extendedFields = { case_name_as_keyword: 'My incident' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({ title: 'My incident' });
  });

  it('maps a text field value to the system description field', () => {
    const fields = [makeTextField('summary', 'description')];
    const extendedFields = { summary_as_keyword: 'Brief summary' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({
      description: 'Brief summary',
    });
  });

  it('maps a text field value to the system category field', () => {
    const fields = [makeTextField('area', 'category')];
    const extendedFields = { area_as_keyword: 'Infrastructure' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({
      category: 'Infrastructure',
    });
  });

  it('applies value_map when mapping to severity', () => {
    const fields = [
      makeSeverityField('priority', {
        P1: 'critical',
        P2: 'high',
        P3: 'medium',
        P4: 'low',
      }),
    ];

    expect(applySystemFieldMappings(fields, { priority_as_keyword: 'P1' })).toEqual({
      severity: 'critical',
    });
    expect(applySystemFieldMappings(fields, { priority_as_keyword: 'P4' })).toEqual({
      severity: 'low',
    });
  });

  it('omits severity override when raw value is not in value_map', () => {
    const fields = [makeSeverityField('priority', { P1: 'critical' })];
    const extendedFields = { priority_as_keyword: 'unknown' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when the extended field key is absent', () => {
    const fields = [makeTextField('case_name', 'title')];
    const extendedFields = {}; // key missing

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when the extended field value is null', () => {
    const fields = [makeTextField('case_name', 'title')];
    const extendedFields = { case_name_as_keyword: null };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('returns empty object when no fields have system.maps_to', () => {
    const fields = [makeUnmappedField('notes'), makeUnmappedField('effort')];
    const extendedFields = { notes_as_keyword: 'something', effort_as_keyword: '5' };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({});
  });

  it('handles multiple mapped fields at once', () => {
    const fields = [
      makeTextField('case_name', 'title'),
      makeTextField('details', 'description'),
      makeSeverityField('priority', { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' }),
    ];
    const extendedFields = {
      case_name_as_keyword: 'Outage',
      details_as_keyword: 'DB went down',
      priority_as_keyword: 'P2',
    };

    expect(applySystemFieldMappings(fields, extendedFields)).toEqual({
      title: 'Outage',
      description: 'DB went down',
      severity: 'high',
    });
  });

  it('returns empty object when extendedFields is empty', () => {
    const fields = [makeTextField('case_name', 'title')];

    expect(applySystemFieldMappings(fields, {})).toEqual({});
  });
});
