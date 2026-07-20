/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { stringify as yamlStringify } from 'yaml';
import expect from '@kbn/expect';
import type { SavedObject } from '@kbn/core/server';
import {
  CASE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { deleteAllCaseItems, createCase, getSpaceUrlPrefix } from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const TEMPLATES_URL = '/internal/cases/templates';
const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';

const buildFieldDefinitionBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'incident_type',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'incident_type',
    control: 'INPUT_TEXT',
    label: 'Incident Type',
    type: 'keyword',
  }),
  ...overrides,
});

const buildGlobalFieldDefinitionBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'environment',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'environment',
    control: 'SELECT_BASIC',
    label: 'Environment',
    type: 'keyword',
    metadata: { options: ['prod', 'staging', 'dev'] },
  }),
  isGlobal: true,
  ...overrides,
});

const buildTemplateBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'Security Incident Template',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'Security Incident',
    // $ref to the field library entry
    fields: [{ $ref: 'incident_type' }],
  }),
  isEnabled: true,
  ...overrides,
});

const ndjsonToObjects = (text: string): Array<SavedObject<Record<string, unknown>>> =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('import and export cases with Templates v2', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('exports a case with its referenced template and field definitions', async () => {
      // Create a $ref field definition (used by the template)
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildFieldDefinitionBody())
        .expect(200);

      // Create a global field definition (should always be bundled, regardless of template reference)
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildGlobalFieldDefinitionBody())
        .expect(200);

      // Create the template that $refs the field definition
      const { body: template } = await supertest
        .post(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildTemplateBody())
        .expect(200);

      // Create a case that references the template
      await createCase(supertest, {
        ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        template: { id: template.templateId, version: template.templateVersion },
      });

      // Export all cases
      const { text } = await supertest
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObjects(text);

      // Should contain the case itself
      const caseSOs = objects.filter((so) => so.type === CASE_SAVED_OBJECT);
      expect(caseSOs).to.have.length(1);

      // Should contain the referenced template
      const templateSOs = objects.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT);
      expect(templateSOs).to.have.length(1);
      expect(templateSOs[0].attributes.templateId).to.eql(template.templateId);

      // Should contain both field definitions: the $ref'd one and the global one
      const fieldDefSOs = objects.filter((so) => so.type === CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefSOs).to.have.length(2);
      const fieldDefNames = fieldDefSOs.map((so) => so.attributes.name);
      expect(fieldDefNames).to.contain('incident_type');
      expect(fieldDefNames).to.contain('environment');
    });

    it('exports a case without a template reference without including template SOs', async () => {
      // Create a template and field def that should NOT be bundled (case does not reference them)
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildTemplateBody())
        .expect(200);
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildFieldDefinitionBody())
        .expect(200);

      // Case has no template reference
      await createCase(supertest, getPostCaseRequest());

      const { text } = await supertest
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObjects(text);

      expect(objects.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT)).to.have.length(0);
      // With no template reference, getTemplatesAndFieldDefinitionsForCases returns early with []
      // — no field definitions are bundled regardless of isGlobal.
      expect(objects.filter((so) => so.type === CASE_FIELD_DEFINITION_SAVED_OBJECT)).to.have.length(
        0
      );
    });

    it('imports a case with a template and field definitions from a fixture', async () => {
      await supertest
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../common/fixtures/saved_object_exports/case_with_template_and_field_defs.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      // The case should be importable and findable
      const { body: findResponse } = await supertest
        .get('/api/cases/_find')
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(findResponse.total).to.eql(1);
      expect(findResponse.cases[0].title).to.eql('A case with a template');

      // The template should have been imported
      const { body: templatesResponse } = await supertest
        .get(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(templatesResponse.templates).to.have.length(1);
      expect(templatesResponse.templates[0].name).to.eql('Imported Template');

      // The field definition should have been imported
      const { body: fieldDefsResponse } = await supertest
        .get(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .query({ owner: 'securitySolutionFixture' })
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(fieldDefsResponse.fieldDefinitions).to.have.length(1);
      expect(fieldDefsResponse.fieldDefinitions[0].name).to.eql('priority');
    });
  });
};
