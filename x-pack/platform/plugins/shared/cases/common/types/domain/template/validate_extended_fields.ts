/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { FieldSchema } from './fields';
import { FieldType } from './fields';
import { evaluateCondition } from './evaluate_conditions';

type FieldSchemaType = z.infer<typeof FieldSchema>;

const validateField = (field: FieldSchemaType, value: string, errors: string[]): void => {
  const label = field.label ?? field.name;

  // Pattern
  if (field.validation?.pattern) {
    const { regex, message } = field.validation.pattern;
    try {
      if (!new RegExp(regex).test(value)) {
        errors.push(message ?? `Field "${label}" does not match pattern ${regex}`);
      }
    } catch {
      // invalid regex in template definition — skip silently
    }
  }

  // Length (text/textarea)
  if (field.control === FieldType.INPUT_TEXT || field.control === FieldType.TEXTAREA) {
    if (field.validation?.min_length !== undefined && value.length < field.validation.min_length) {
      errors.push(`Field "${label}" must be at least ${field.validation.min_length} characters`);
    }
    if (field.validation?.max_length !== undefined && value.length > field.validation.max_length) {
      errors.push(`Field "${label}" must be at most ${field.validation.max_length} characters`);
    }
  }

  // Numeric range
  if (field.control === FieldType.INPUT_NUMBER) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      errors.push(`Field "${label}" must be a number`);
    } else {
      if (field.validation?.min !== undefined && num < field.validation.min) {
        errors.push(`Field "${label}" must be >= ${field.validation.min}`);
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        errors.push(`Field "${label}" must be <= ${field.validation.max}`);
      }
    }
  }

  // Options
  if (field.control === FieldType.SELECT_BASIC || field.control === FieldType.RADIO_GROUP) {
    const options = field.metadata?.options ?? [];
    if (!options.includes(value)) {
      errors.push(`Field "${label}" must be one of: ${options.join(', ')}`);
    }
  }
};

export const validateExtendedFields = (
  extendedFields: Record<string, string>,
  fields: FieldSchemaType[]
): string[] => {
  const errors: string[] = [];

  // 1. Build valid key set
  const validKeys = new Set(fields.map((f) => `${f.name}_as_${f.type}`));

  // 2. Unknown keys
  for (const key of Object.keys(extendedFields)) {
    if (!validKeys.has(key)) {
      errors.push(`Unknown extended field key: "${key}"`);
    }
  }

  // 3. Build helper maps
  const fieldValues: Record<string, string | undefined> = {};
  const fieldTypeMap: Record<string, string> = {};
  for (const field of fields) {
    fieldValues[field.name] = extendedFields[`${field.name}_as_${field.type}`];
    fieldTypeMap[field.name] = field.type;
  }

  // 4. Per-field validation
  for (const field of fields) {
    const isHidden =
      field.display?.show_when != null &&
      !evaluateCondition(field.display.show_when, fieldValues, fieldTypeMap);

    if (!isHidden) {
      const value = fieldValues[field.name];
      const isEmpty = value === undefined || value === null || value === '';

      const isRequired =
        field.validation?.required === true ||
        (field.validation?.required_when
          ? evaluateCondition(field.validation.required_when, fieldValues, fieldTypeMap)
          : false);

      if (isRequired && isEmpty) {
        errors.push(`Field "${field.label ?? field.name}" is required`);
      } else if (!isEmpty) {
        validateField(field, value, errors);
      }
    }
  }

  return errors;
};
