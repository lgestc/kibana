/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../types/domain/template/fields';

export interface SystemFieldOverrides {
  title?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string | null;
}

/**
 * Given the parsed template fields and the submitted extended_fields object,
 * returns any system field overrides declared via `field.system.maps_to`.
 *
 * Mapped values take precedence over form-level defaults — this ensures
 * consistent telemetry across case types.
 *
 * Extended fields are keyed as `{name}_as_{type}` per the template field
 * renderer convention.
 */
export const applySystemFieldMappings = (
  fields: FieldDefinition[],
  extendedFields: Record<string, unknown>
): SystemFieldOverrides => {
  const overrides: SystemFieldOverrides = {};

  for (const field of fields) {
    const { system } = field;
    if (!system) continue;

    const extendedKey = `${field.name}_as_${field.type}`;
    const rawValue = extendedFields[extendedKey];
    if (rawValue != null) {
      const rawString = String(rawValue);

      if (system.maps_to === 'severity') {
        const mapped = system.value_map[rawString];
        if (mapped != null) {
          overrides.severity = mapped;
        }
      } else if (system.maps_to === 'title') {
        overrides.title = rawString;
      } else if (system.maps_to === 'description') {
        overrides.description = rawString;
      } else if (system.maps_to === 'category') {
        overrides.category = rawString;
      }
    }
  }

  return overrides;
};
