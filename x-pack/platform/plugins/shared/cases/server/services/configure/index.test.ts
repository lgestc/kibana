/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseConnector,
  CaseCustomFields,
  ConfigurationAttributes,
} from '../../../common/types/domain';
import { CustomFieldTypes, ConnectorTypes, CaseSeverity } from '../../../common/types/domain';
import { CASE_CONFIGURE_SAVED_OBJECT, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsCreateOptions,
  SavedObjectsFindResult,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { CaseConfigureService } from '.';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import type { ESCaseConnectorWithId } from '../test_utils';
import { createESJiraConnector, createJiraConnector } from '../test_utils';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import { unset } from 'lodash';
import type { ConfigurationPatchRequest } from '../../../common/types/api';

const basicConfigFields = {
  closure_type: 'close-by-pushing' as const,
  owner: SECURITY_SOLUTION_OWNER,
  created_at: '2020-04-09T09:43:51.778Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  updated_at: '2020-04-09T09:43:51.778Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  customFields: [
    {
      type: CustomFieldTypes.TOGGLE as const,
      key: 'toggle_custom_field',
      label: 'Toggle',
      required: true,
      defaultValue: true,
    },
    {
      type: CustomFieldTypes.TEXT as const,
      key: 'text_custom_field',
      label: 'Text',
      required: true,
      defaultValue: 'foobar',
    },
  ],
  templates: [
    {
      key: 'test_template_1',
      name: 'First test template',
      description: 'This is a first test template',
      caseFields: null,
    },
    {
      key: 'test_template_4',
      name: 'Fourth test template',
      description: 'This is a fourth test template',
      caseFields: {
        title: 'Case with sample template 4',
        description: 'case desc',
        severity: CaseSeverity.LOW,
        category: null,
        tags: ['sample-4'],
        assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
        customFields: [
          {
            key: 'first_custom_field_key',
            type: CustomFieldTypes.TEXT,
            value: 'this is a text field value',
          },
        ] as CaseCustomFields,
        connector: {
          id: 'none',
          name: 'My Connector',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
    },
  ],
  observableTypes: [
    {
      key: '011c2c4e-794f-4837-8d94-22b07722ab14',
      label: 'test observable type',
    },
  ],
};

const createConfigUpdateParams = (connector?: CaseConnector): Partial<ConfigurationAttributes> => ({
  connector,
});

const createConfigPostParams = (connector: CaseConnector): ConfigurationAttributes => ({
  ...basicConfigFields,
  connector,
});

const createUpdateConfigSO = (
  connector?: ESCaseConnectorWithId
): SavedObjectsUpdateResponse<ConfigurationPersistedAttributes> => {
  const references: SavedObjectReference[] =
    connector && connector.id !== 'none'
      ? [
          {
            id: connector.id,
            name: CONNECTOR_ID_REFERENCE_NAME,
            type: ACTION_SAVED_OBJECT_TYPE,
          },
        ]
      : [];

  return {
    type: CASE_CONFIGURE_SAVED_OBJECT,
    id: '1',
    attributes: {
      connector: connector
        ? { name: connector.name, type: connector.type, fields: connector.fields }
        : undefined,
    },
    version: '1',
    references,
  };
};

const createConfigSO = (
  connector?: ESCaseConnectorWithId
): SavedObject<ConfigurationPersistedAttributes> => {
  const references: SavedObjectReference[] = connector
    ? [
        {
          id: connector.id,
          name: CONNECTOR_ID_REFERENCE_NAME,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : [];

  const formattedConnector = {
    type: connector?.type ?? ConnectorTypes.jira,
    name: connector?.name ?? ConnectorTypes.jira,
    fields: connector?.fields ?? null,
  };

  return {
    type: CASE_CONFIGURE_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...basicConfigFields,
      // if connector is null we'll default this to an incomplete jira value because the service
      // should switch it to a none connector when the id can't be found in the references array
      connector: formattedConnector,
    },
    references,
  };
};

const createConfigSOPromise = (
  connector?: ESCaseConnectorWithId
): Promise<SavedObject<ConfigurationPersistedAttributes>> =>
  Promise.resolve(createConfigSO(connector));

const createConfigFindSO = (
  connector?: ESCaseConnectorWithId
): SavedObjectsFindResult<ConfigurationPersistedAttributes> => ({
  ...createConfigSO(connector),
  score: 0,
});

const createSOFindResponse = (
  savedObjects: Array<SavedObjectsFindResult<ConfigurationPersistedAttributes>>
) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  per_page: savedObjects.length,
  page: 1,
});

describe('CaseConfigureService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: CaseConfigureService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CaseConfigureService(mockLogger);
  });

  describe('transforms the external model to the Elasticsearch model', () => {
    describe('patch', () => {
      it('creates the update attributes with the fields that were passed in', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigPostParams(createJiraConnector()),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        const { connector: ignoreConnector, ...restUpdateAttributes } = unsecuredSavedObjectsClient
          .update.mock.calls[0][2] as Partial<ConfigurationPersistedAttributes>;

        expect(restUpdateAttributes).toMatchInlineSnapshot(`
          Object {
            "closure_type": "close-by-pushing",
            "created_at": "2020-04-09T09:43:51.778Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "customFields": Array [
              Object {
                "defaultValue": true,
                "key": "toggle_custom_field",
                "label": "Toggle",
                "required": true,
                "type": "toggle",
              },
              Object {
                "defaultValue": "foobar",
                "key": "text_custom_field",
                "label": "Text",
                "required": true,
                "type": "text",
              },
            ],
            "observableTypes": Array [
              Object {
                "key": "011c2c4e-794f-4837-8d94-22b07722ab14",
                "label": "test observable type",
              },
            ],
            "owner": "securitySolution",
            "templates": Array [
              Object {
                "caseFields": null,
                "description": "This is a first test template",
                "key": "test_template_1",
                "name": "First test template",
              },
              Object {
                "caseFields": Object {
                  "assignees": Array [
                    Object {
                      "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                    },
                  ],
                  "category": null,
                  "connector": Object {
                    "fields": null,
                    "id": "none",
                    "name": "My Connector",
                    "type": ".none",
                  },
                  "customFields": Array [
                    Object {
                      "key": "first_custom_field_key",
                      "type": "text",
                      "value": "this is a text field value",
                    },
                  ],
                  "description": "case desc",
                  "severity": "low",
                  "tags": Array [
                    "sample-4",
                  ],
                  "title": "Case with sample template 4",
                },
                "description": "This is a fourth test template",
                "key": "test_template_4",
                "name": "Fourth test template",
              },
            ],
            "updated_at": "2020-04-09T09:43:51.778Z",
            "updated_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('transforms the connector.fields to an array of key/value pairs', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigPostParams(createJiraConnector()),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        const { connector } = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ConfigurationPersistedAttributes>;

        expect(connector?.fields).toMatchInlineSnapshot(`
          Array [
            Object {
              "key": "issueType",
              "value": "bug",
            },
            Object {
              "key": "priority",
              "value": "high",
            },
            Object {
              "key": "parent",
              "value": "2",
            },
          ]
        `);
      });

      it('preserves the connector fields but does not include the id', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigPostParams(createJiraConnector()),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        const { connector } = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ConfigurationPersistedAttributes>;

        expect(connector).toMatchInlineSnapshot(`
          Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "bug",
              },
              Object {
                "key": "priority",
                "value": "high",
              },
              Object {
                "key": "parent",
                "value": "2",
              },
            ],
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(connector).not.toHaveProperty('id');
      });

      it('moves the connector.id to the references', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigPostParams(createJiraConnector()),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        const updateAttributes = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ConfigurationPersistedAttributes>;

        expect(updateAttributes.connector).not.toHaveProperty('id');

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('moves the connector.id to the references and includes the existing references', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigPostParams(createJiraConnector()),
          originalConfiguration: {
            references: [{ id: '123', name: 'awesome', type: 'hello' }],
          } as SavedObject<ConfigurationAttributes>,
        });

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "123",
              "name": "awesome",
              "type": "hello",
            },
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('does not remove the connector.id reference when the update attributes do not include it', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {
            references: [
              { id: '123', name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
            ],
          } as SavedObject<ConfigurationAttributes>,
        });

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "123",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('creates an empty update object and null reference when there is no connector', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(
          `Object {}`
        );
        expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
          Object {
            "references": undefined,
            "refresh": undefined,
          }
        `);
      });

      it('creates an update object with the none connector', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );

        await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(getNoneCaseConnector()),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Array [],
              "name": "none",
              "type": ".none",
            },
          }
        `);
        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions;
        expect(updateOptions.references).toEqual([]);
      });
    });

    describe('post', () => {
      it('includes the creation attributes excluding the connector.id field', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({
            attributes: createConfigPostParams(createJiraConnector()),
            id: '1',
            type: CASE_CONFIGURE_SAVED_OBJECT,
            references: [],
          })
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector()),
          id: '1',
        });

        const creationAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as ConfigurationPersistedAttributes;
        expect(creationAttributes.connector).not.toHaveProperty('id');
        expect(creationAttributes).toMatchInlineSnapshot(`
          Object {
            "closure_type": "close-by-pushing",
            "connector": Object {
              "fields": Array [
                Object {
                  "key": "issueType",
                  "value": "bug",
                },
                Object {
                  "key": "priority",
                  "value": "high",
                },
                Object {
                  "key": "parent",
                  "value": "2",
                },
              ],
              "name": ".jira",
              "type": ".jira",
            },
            "created_at": "2020-04-09T09:43:51.778Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "customFields": Array [
              Object {
                "defaultValue": true,
                "key": "toggle_custom_field",
                "label": "Toggle",
                "required": true,
                "type": "toggle",
              },
              Object {
                "defaultValue": "foobar",
                "key": "text_custom_field",
                "label": "Text",
                "required": true,
                "type": "text",
              },
            ],
            "observableTypes": Array [
              Object {
                "key": "011c2c4e-794f-4837-8d94-22b07722ab14",
                "label": "test observable type",
              },
            ],
            "owner": "securitySolution",
            "templates": Array [
              Object {
                "caseFields": null,
                "description": "This is a first test template",
                "key": "test_template_1",
                "name": "First test template",
              },
              Object {
                "caseFields": Object {
                  "assignees": Array [
                    Object {
                      "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                    },
                  ],
                  "category": null,
                  "connector": Object {
                    "fields": null,
                    "id": "none",
                    "name": "My Connector",
                    "type": ".none",
                  },
                  "customFields": Array [
                    Object {
                      "key": "first_custom_field_key",
                      "type": "text",
                      "value": "this is a text field value",
                    },
                  ],
                  "description": "case desc",
                  "severity": "low",
                  "tags": Array [
                    "sample-4",
                  ],
                  "title": "Case with sample template 4",
                },
                "description": "This is a fourth test template",
                "key": "test_template_4",
                "name": "Fourth test template",
              },
            ],
            "updated_at": "2020-04-09T09:43:51.778Z",
            "updated_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('moves the connector.id to the references', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({
            attributes: createConfigPostParams(createJiraConnector()),
            id: '1',
            type: CASE_CONFIGURE_SAVED_OBJECT,
            references: [],
          })
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": Array [
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ],
            "refresh": undefined,
          }
        `);
      });

      it('sets connector.fields to an empty array when it is not included', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({
            attributes: createConfigPostParams(createJiraConnector()),
            id: '1',
            type: CASE_CONFIGURE_SAVED_OBJECT,
            references: [],
          })
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector({ setFieldsToNull: true })),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as ConfigurationAttributes;
        expect(postAttributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": Array [],
            "name": ".jira",
            "type": ".jira",
          }
        `);
      });

      it('does not create a reference for a none connector', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({
            attributes: createConfigPostParams(createJiraConnector()),
            id: '1',
            type: CASE_CONFIGURE_SAVED_OBJECT,
            references: [],
          })
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(getNoneCaseConnector()),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toEqual([]);
      });
    });
  });

  describe('transform the Elasticsearch model to the external model', () => {
    describe('patch', () => {
      it('returns an object with a none connector and without a reference', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateConfigSO(getNoneCaseConnector()))
        );

        const res = await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(res.attributes).toMatchInlineSnapshot(`
            Object {
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
            }
          `);
        expect(res.references).toMatchInlineSnapshot(`Array []`);
      });

      it('returns an undefined connector if it is not returned by the update', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPersistedAttributes>)
        );

        const res = await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(res).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {},
            }
          `);
      });

      it('returns the default none connector when it cannot find the reference', async () => {
        const { name, type, fields } = createESJiraConnector();
        const returnValue: SavedObjectsUpdateResponse<ConfigurationPersistedAttributes> = {
          type: CASE_CONFIGURE_SAVED_OBJECT,
          id: '1',
          attributes: {
            connector: {
              name,
              type,
              fields,
            },
          },
          version: '1',
          references: undefined,
        };

        unsecuredSavedObjectsClient.update.mockReturnValue(Promise.resolve(returnValue));

        const res = await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });

      it('returns a jira connector', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateConfigSO(createESJiraConnector()))
        );

        const res = await service.patch({
          configurationId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createConfigUpdateParams(),
          originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
        });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
            Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "id": "1",
              "name": ".jira",
              "type": ".jira",
            }
          `);
      });
    });

    describe('find', () => {
      it('includes the id field in the response', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESJiraConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        expect(res.saved_objects[0].attributes.connector.id).toMatchInlineSnapshot(`"1"`);
      });

      it('includes the saved object find response fields in the result', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESJiraConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        const { saved_objects: ignored, ...findResponseFields } = res;
        expect(findResponseFields).toMatchInlineSnapshot(`
          Object {
            "page": 1,
            "per_page": 2,
            "total": 2,
          }
        `);
      });

      it('defaults to the none connector when the id cannot be found in the references', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESJiraConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        expect(res.saved_objects[1].attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });
    });

    describe('get', () => {
      it('includes the id field in the response', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          createConfigSOPromise(createESJiraConnector())
        );
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

        expect(res.attributes.connector.id).toMatchInlineSnapshot(`"1"`);
      });

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(createConfigSOPromise());
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });

      it('defaults to the none connector when the persisted connector is undefined', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve({
            attributes: createConfigPostParams(undefined as unknown as CaseConnector),
            id: '1',
            type: CASE_CONFIGURE_SAVED_OBJECT,
            references: [
              {
                id: '1',
                name: CONNECTOR_ID_REFERENCE_NAME,
                type: ACTION_SAVED_OBJECT_TYPE,
              },
            ],
          } as unknown as SavedObject<ConfigurationPersistedAttributes>)
        );
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });
    });
  });

  describe('Decoding requests', () => {
    describe('post', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({
          attributes: createConfigPostParams(createJiraConnector()),
          id: '1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          references: [],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        const attributes = createConfigPostParams(createJiraConnector());

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            id: '1',
          })
        ).resolves.not.toThrow();
      });

      it('throws if closure_type is omitted', async () => {
        const attributes = createConfigPostParams(createJiraConnector());
        unset(attributes, 'closure_type');

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            id: '1',
          })
        ).rejects.toThrow(`Invalid value "undefined" supplied to "closure_type"`);
      });

      it('strips out excess attributes', async () => {
        const attributes = { ...createConfigPostParams(createJiraConnector()), foo: 'bar' };

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            id: '1',
          })
        ).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.create.mock.calls[0][1];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });

    describe('patch', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ConfigurationPatchRequest>)
        );
      });

      it('decodes correctly the requested attributes', async () => {
        const updatedAttributes = createConfigPostParams(createJiraConnector());

        await expect(
          service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes,
            originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
          })
        ).resolves.not.toThrow();
      });

      it('strips out excess attributes', async () => {
        const updatedAttributes = { ...createConfigPostParams(createJiraConnector()), foo: 'bar' };

        await expect(
          service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes,
            originalConfiguration: {} as SavedObject<ConfigurationAttributes>,
          })
        ).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.update.mock.calls[0][2];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });
  });
});
