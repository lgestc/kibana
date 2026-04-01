/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../types/domain/template/fields';

/**
 * Returns the list of system field names that are mapped by the given template fields.
 * Used to persist `mappedSystemFields` on the template SO and to hide the
 * corresponding inputs in the case creation form.
 */
export const getMappedSystemFields = (fields: FieldDefinition[]): string[] =>
  fields.flatMap((f) => (f.system?.maps_to ? [f.system.maps_to] : []));
