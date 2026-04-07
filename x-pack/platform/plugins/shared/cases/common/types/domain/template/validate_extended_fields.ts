/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FieldSchema, FieldType } from './fields';
import { evaluateCondition } from './evaluate_conditions';

type FieldSchemaType = z.infer<typeof FieldSchema>;

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
    // Skip hidden fields
    if (
      field.display?.show_when &&
      !evaluateCondition(field.display.show_when, fieldValues, fieldTypeMap)
    ) {
      continue;
    }

    const value = fieldValues[field.name];
    const isEmpty = value === undefined || value === null || value === '';

    // Required check
    const isRequired =
      field.validation?.required === true ||
      (field.validation?.required_when
        ? evaluateCondition(field.validation.required_when, fieldValues, fieldTypeMap)
        : false);

    if (isRequired && isEmpty) {
      errors.push(`Field "${field.label ?? field.name}" is required`);
      continue;
    }

    if (isEmpty) continue;

    // Pattern
    if (field.validation?.pattern) {
      const { regex, message } = field.validation.pattern;
      try {
        if (!new RegExp(regex).test(value!)) {
          errors.push(
            message ?? `Field "${field.label ?? field.name}" does not match pattern ${regex}`
          );
        }
      } catch {
        // invalid regex in template definition — skip silently
      }
    }

    // Length (text/textarea)
    if (field.control === FieldType.INPUT_TEXT || field.control === FieldType.TEXTAREA) {
      if (
        field.validation?.min_length !== undefined &&
        value!.length < field.validation.min_length
      ) {
        errors.push(
          `Field "${field.label ?? field.name}" must be at least ${field.validation.min_length} characters`
        );
      }
      if (
        field.validation?.max_length !== undefined &&
        value!.length > field.validation.max_length
      ) {
        errors.push(
          `Field "${field.label ?? field.name}" must be at most ${field.validation.max_length} characters`
        );
      }
    }

    // Numeric range
    if (field.control === FieldType.INPUT_NUMBER) {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        errors.push(`Field "${field.label ?? field.name}" must be a number`);
      } else {
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors.push(`Field "${field.label ?? field.name}" must be >= ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors.push(`Field "${field.label ?? field.name}" must be <= ${field.validation.max}`);
        }
      }
    }

    // Options
    if (field.control === FieldType.SELECT_BASIC) {
      const options = field.metadata?.options ?? [];
      if (!options.includes(value!)) {
        errors.push(
          `Field "${field.label ?? field.name}" must be one of: ${options.join(', ')}`
        );
      }
    }
  }

  return errors;
};
