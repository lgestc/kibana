/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, isPlainObject } from 'lodash';
import * as t from 'io-ts';
import { ordString } from 'fp-ts/Ord';
import { toArray } from 'fp-ts/Set';
import { isLeft, isRight } from 'fp-ts/Either';

import { errorReporter } from './error_reporter';
import { ALL_DATA_TYPES, PARAMETERS_DEFINITION, MapperSizePluginId } from '../constants';
import { FieldMeta } from '../types';
import { getFieldMeta } from './utils';

const ALLOWED_FIELD_PROPERTIES = [
  ...Object.keys(PARAMETERS_DEFINITION),
  'type',
  'properties',
  'fields',
];

const DEFAULT_FIELD_TYPE = 'object';

export type MappingsValidationError =
  | { code: 'ERR_CONFIG'; configName: string }
  | { code: 'ERR_FIELD'; fieldPath: string }
  | { code: 'ERR_PARAMETER'; paramName: string; fieldPath: string };

export interface MappingsValidatorResponse {
  /* The parsed mappings object without any error */
  value: GenericObject;
  errors?: MappingsValidationError[];
}

interface PropertiesValidatorResponse {
  /* The parsed "properties" object without any error */
  value: GenericObject;
  errors: MappingsValidationError[];
}

interface FieldValidatorResponse {
  /* The parsed field. If undefined means that it was invalid */
  value?: GenericObject;
  parametersRemoved: string[];
}

interface GenericObject {
  [key: string]: any;
}

interface ValidationResponse {
  value: GenericObject;
  errors: MappingsValidationError[];
}

const validateFieldType = (type: any): boolean => {
  if (typeof type !== 'string') {
    return false;
  }

  if (!ALL_DATA_TYPES.includes(type)) {
    return false;
  }
  return true;
};

const validateParameter = (parameter: string, value: any): boolean => {
  if (parameter === 'type') {
    return true;
  }

  if (parameter === 'name') {
    return false;
  }

  if (parameter === 'properties' || parameter === 'fields') {
    return isPlainObject(value);
  }

  const parameterSchema = (PARAMETERS_DEFINITION as any)[parameter]!.schema;
  if (parameterSchema) {
    return isRight(parameterSchema.decode(value));
  }

  // Fallback, if no schema defined for the parameter (this should not happen in theory)
  return true;
};

const stripUnknownOrInvalidParameter = (field: GenericObject): FieldValidatorResponse =>
  Object.entries(field).reduce(
    (acc, [key, value]) => {
      if (!ALLOWED_FIELD_PROPERTIES.includes(key) || !validateParameter(key, value)) {
        acc.parametersRemoved.push(key);
      } else {
        acc.value = acc.value ?? {};
        acc.value[key] = value;
      }
      return acc;
    },
    { parametersRemoved: [] } as FieldValidatorResponse
  );

const parseField = (field: any): FieldValidatorResponse & { meta?: FieldMeta } => {
  // Sanitize the input to make sure we are working with an object
  if (!isPlainObject(field)) {
    return { parametersRemoved: [] };
  }
  // Make sure the field "type" is valid
  if (!validateFieldType(field.type ?? DEFAULT_FIELD_TYPE)) {
    return { parametersRemoved: [] };
  }

  // Filter out unknown or invalid "parameters"
  const fieldWithType = { type: DEFAULT_FIELD_TYPE, ...field };
  const parsedField = stripUnknownOrInvalidParameter(fieldWithType);
  const meta = getFieldMeta(fieldWithType);

  return { ...parsedField, meta };
};

const parseFields = (
  properties: GenericObject,
  path: string[] = []
): PropertiesValidatorResponse => {
  return Object.entries(properties).reduce(
    (acc, [fieldName, unparsedField]) => {
      const fieldPath = [...path, fieldName].join('.');
      const { value: parsedField, parametersRemoved, meta } = parseField(unparsedField);

      if (parsedField === undefined) {
        // Field has been stripped out because it was invalid
        acc.errors.push({ code: 'ERR_FIELD', fieldPath });
      } else {
        if (meta!.hasChildFields || meta!.hasMultiFields) {
          // Recursively parse all the possible children ("properties" or "fields" for multi-fields)
          const parsedChildren = parseFields(parsedField[meta!.childFieldsName!], [
            ...path,
            fieldName,
          ]);
          parsedField[meta!.childFieldsName!] = parsedChildren.value;

          /**
           * If the children parsed have any error we concatenate them in our accumulator.
           */
          if (parsedChildren.errors) {
            acc.errors = [...acc.errors, ...parsedChildren.errors];
          }
        }

        acc.value[fieldName] = parsedField;

        if (Boolean(parametersRemoved.length)) {
          acc.errors = [
            ...acc.errors,
            ...parametersRemoved.map((paramName) => ({
              code: 'ERR_PARAMETER' as 'ERR_PARAMETER',
              fieldPath,
              paramName,
            })),
          ];
        }
      }

      return acc;
    },
    {
      value: {},
      errors: [],
    } as PropertiesValidatorResponse
  );
};

/**
 * Utility function that reads a mappings "properties" object and validate its fields by
 * - Removing unknown field types
 * - Removing unknown field parameters or field parameters that don't have the correct format.
 *
 * This method does not mutate the original properties object. It returns an object with
 * the parsed properties and an array of field paths that have been removed.
 * This allows us to display a warning in the UI and let the user correct the fields that we
 * are about to remove.
 *
 * NOTE: The Joi Schema that we defined for each parameter (in "parameters_definition".tsx)
 * does not do an exhaustive validation of the parameter value.
 * It's main purpose is to prevent the UI from blowing up.
 *
 * @param properties A mappings "properties" object
 */
export const validateProperties = (properties: unknown = {}): PropertiesValidatorResponse => {
  // Sanitize the input to make sure we are working with an object
  if (!isPlainObject(properties)) {
    return { value: {}, errors: [] };
  }

  return parseFields(properties as GenericObject);
};

/**
 * Single source of truth to validate the *configuration* of the mappings.
 * Whenever a user loads a JSON object it will be validate against this Joi schema.
 */
export const mappingsConfigurationSchema = t.exact(
  t.partial({
    properties: t.UnknownRecord,
    _data_stream_timestamp: t.interface({
      enabled: t.boolean,
    }),
    runtime: t.UnknownRecord,
    dynamic: t.union([
      t.literal(true),
      t.literal(false),
      t.literal('strict'),
      t.literal('true'),
      t.literal('false'),
      t.literal('runtime'),
    ]),
    date_detection: t.boolean,
    numeric_detection: t.boolean,
    dynamic_date_formats: t.array(t.string),
    _source: t.exact(
      t.partial({
        enabled: t.boolean,
        includes: t.array(t.string),
        excludes: t.array(t.string),
        mode: t.union([t.literal('disabled'), t.literal('stored'), t.literal('synthetic')]),
      })
    ),
    _meta: t.UnknownRecord,
    _routing: t.interface({
      required: t.boolean,
    }),
    dynamic_templates: t.array(t.UnknownRecord),
    // Mapper size plugin
    _size: t.interface({
      enabled: t.boolean,
    }),
    subobjects: t.boolean,
  })
);

export const mappingsConfigurationSchemaKeys = Object.keys(mappingsConfigurationSchema.type.props);

const sourceConfigurationSchemaKeys = Object.keys(
  mappingsConfigurationSchema.type.props._source.type.props
);

export const validateMappingsConfiguration = (
  mappingsConfiguration: GenericObject
): ValidationResponse => {
  // Set to keep track of invalid configuration parameters.
  const configurationRemoved: Set<string> = new Set();

  let copyOfMappingsConfig = { ...mappingsConfiguration };
  const result = mappingsConfigurationSchema.decode(mappingsConfiguration);
  const isSchemaInvalid = isLeft(result);

  const unknownConfigurationParameters = Object.keys(mappingsConfiguration).filter(
    (key) => mappingsConfigurationSchemaKeys.includes(key) === false
  );

  const unknownSourceConfigurationParameters =
    mappingsConfiguration._source !== undefined
      ? Object.keys(mappingsConfiguration._source).filter(
          (key) => sourceConfigurationSchemaKeys.includes(key) === false
        )
      : [];

  if (isSchemaInvalid) {
    /**
     * To keep the logic simple we will strip out the parameters that contain errors
     */
    const errors = errorReporter.report(result);
    errors.forEach((error) => {
      const configurationName = error.path[0];
      configurationRemoved.add(configurationName);
      delete copyOfMappingsConfig[configurationName];
    });
  }

  if (unknownConfigurationParameters.length > 0) {
    unknownConfigurationParameters.forEach((configName) => configurationRemoved.add(configName));
  }

  if (unknownSourceConfigurationParameters.length > 0) {
    configurationRemoved.add('_source');
    delete copyOfMappingsConfig._source;
  }

  copyOfMappingsConfig = pick(copyOfMappingsConfig, mappingsConfigurationSchemaKeys);

  const errors: MappingsValidationError[] = toArray<string>(ordString)(configurationRemoved)
    .map((configName) => ({
      code: 'ERR_CONFIG',
      configName,
    }))
    .sort((a, b) => a.configName.localeCompare(b.configName)) as MappingsValidationError[];

  return { value: copyOfMappingsConfig, errors };
};

const validatePluginsParameters =
  (esNodesPlugins: string[]) =>
  (mappingsConfiguration: GenericObject): ValidationResponse => {
    const copyOfMappingsConfig = { ...mappingsConfiguration };
    const errors: MappingsValidationError[] = [];

    // Mapper size plugin parameters
    if ('_size' in copyOfMappingsConfig && !esNodesPlugins.includes(MapperSizePluginId)) {
      errors.push({
        code: 'ERR_CONFIG',
        configName: '_size',
      });
      delete copyOfMappingsConfig._size;
    }

    return { value: copyOfMappingsConfig, errors };
  };

export const validateMappings = (
  mappings: unknown = {},
  esNodesPlugins: string[] = []
): MappingsValidatorResponse => {
  if (!isPlainObject(mappings)) {
    return { value: {} };
  }

  const {
    properties,
    dynamic_templates: dynamicTemplates,
    ...mappingsConfiguration // extract the mappings configuration
  } = mappings as GenericObject;

  // Run the different validators on the mappings configuration. Each validator returns
  // the mapping configuration sanitized (in "value") and possible errors found.
  const { value: parsedConfiguration, errors: configurationErrors } = [
    validateMappingsConfiguration,
    validatePluginsParameters(esNodesPlugins),
  ].reduce<ValidationResponse>(
    (acc, validator) => {
      const { value: sanitizedConfiguration, errors: validationErrors } = validator(acc.value);

      return {
        value: sanitizedConfiguration,
        errors: [...acc.errors, ...validationErrors],
      };
    },
    { value: mappingsConfiguration, errors: [] }
  );

  const { value: parsedProperties, errors: propertiesErrors } = validateProperties(properties);
  const errors = [...configurationErrors, ...propertiesErrors];

  return {
    value: {
      ...parsedConfiguration,
      properties: parsedProperties,
      dynamic_templates: dynamicTemplates ?? [],
    },
    errors: errors.length ? errors : undefined,
  };
};
