/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import yaml from 'js-yaml';

import type { BulkCreateCasesResponse } from '@kbn/cases-plugin/common/types/api';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { CASE_EXTENDED_FIELDS, INTERNAL_TEMPLATES_URL } from '@kbn/cases-plugin/common/constants';
import {
  createCase,
  deleteAllCaseItems,
  getSpaceUrlPrefix,
  updateCase,
} from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { superUser } from '../../../../common/lib/authentication/users';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  /**
   * Creates a template whose YAML definition contains the given fields.
   * Returns the full response body (templateId, templateVersion, …).
   */
  const createTemplate = async (fields: object[]) => {
    const { body } = await supertest
      .post(INTERNAL_TEMPLATES_URL)
      .set('kbn-xsrf', 'true')
      .send({
        name: 'System Field Mapping Template',
        owner: 'securitySolutionFixture',
        definition: yaml.dump({
          name: 'System Field Mapping Template',
          fields,
        }),
        isEnabled: true,
      })
      .expect(200);

    return body as { templateId: string; templateVersion: number };
  };

  describe('system field mappings', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('overrides title with the mapped extended field value', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            title: 'default title',
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: { case_name_as_keyword: 'Mapped title' },
          })
        );

        expect(createdCase.title).to.eql('Mapped title');
      });

      it('overrides description with the mapped extended field value', async () => {
        const template = await createTemplate([
          {
            name: 'summary',
            control: 'TEXTAREA',
            label: 'Summary',
            type: 'keyword',
            system: { maps_to: 'description' },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            description: 'default description',
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'Mapped description' },
          })
        );

        expect(createdCase.description).to.eql('Mapped description');
      });

      it('overrides category with the mapped extended field value', async () => {
        const template = await createTemplate([
          {
            name: 'area',
            control: 'INPUT_TEXT',
            label: 'Area',
            type: 'keyword',
            system: { maps_to: 'category' },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: { area_as_keyword: 'Infrastructure' },
          })
        );

        expect(createdCase.category).to.eql('Infrastructure');
      });

      it('overrides severity via value_map', async () => {
        const template = await createTemplate([
          {
            name: 'priority',
            control: 'SELECT_BASIC',
            label: 'Priority',
            type: 'keyword',
            system: {
              maps_to: 'severity',
              value_map: { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' },
            },
            metadata: { options: ['P1', 'P2', 'P3', 'P4'] },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            severity: CaseSeverity.LOW,
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: { priority_as_keyword: 'P1' },
          })
        );

        expect(createdCase.severity).to.eql(CaseSeverity.CRITICAL);
      });

      it('maps multiple system fields at once', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
          {
            name: 'priority',
            control: 'SELECT_BASIC',
            label: 'Priority',
            type: 'keyword',
            system: {
              maps_to: 'severity',
              value_map: { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' },
            },
            metadata: { options: ['P1', 'P2', 'P3', 'P4'] },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            title: 'default title',
            severity: CaseSeverity.LOW,
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: {
              case_name_as_keyword: 'Multi-mapped title',
              priority_as_keyword: 'P2',
            },
          })
        );

        expect(createdCase.title).to.eql('Multi-mapped title');
        expect(createdCase.severity).to.eql(CaseSeverity.HIGH);
      });

      it('does not override severity when the extended field value is not in value_map', async () => {
        const template = await createTemplate([
          {
            name: 'priority',
            control: 'SELECT_BASIC',
            label: 'Priority',
            type: 'keyword',
            system: {
              maps_to: 'severity',
              value_map: { P1: 'critical' },
            },
            metadata: { options: ['P1', 'UNKNOWN'] },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            severity: CaseSeverity.MEDIUM,
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: { priority_as_keyword: 'UNKNOWN' },
          })
        );

        expect(createdCase.severity).to.eql(CaseSeverity.MEDIUM);
      });

      it('creates the case with defaults when the template does not exist', async () => {
        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            title: 'default title',
            severity: CaseSeverity.LOW,
            template: { id: 'nonexistent-template-id', version: 1 },
            [CASE_EXTENDED_FIELDS]: { case_name_as_keyword: 'Should be ignored' },
          })
        );

        expect(createdCase.title).to.eql('default title');
        expect(createdCase.severity).to.eql(CaseSeverity.LOW);
      });

      it('does not apply mappings when no extended fields are submitted', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
        ]);

        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            title: 'default title',
            template: { id: template.templateId, version: template.templateVersion },
          })
        );

        expect(createdCase.title).to.eql('default title');
      });
    });

    describe('bulk_create', () => {
      /**
       * The bulk create route is only exposed via a test fixture
       * (x-pack/platform/test/cases_api_integration/common/plugins/cases/server/routes.ts).
       */
      const bulkCreate = async (cases: object[]): Promise<BulkCreateCasesResponse> => {
        const { body } = await supertest
          .post(`${getSpaceUrlPrefix(null)}/api/cases_fixture/cases:bulkCreate`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .auth(superUser.username, superUser.password)
          .send({ cases })
          .expect(200);
        return body;
      };

      it('overrides system fields for each case in the bulk request', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
          {
            name: 'priority',
            control: 'SELECT_BASIC',
            label: 'Priority',
            type: 'keyword',
            system: {
              maps_to: 'severity',
              value_map: { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' },
            },
            metadata: { options: ['P1', 'P2', 'P3', 'P4'] },
          },
        ]);

        const result = await bulkCreate([
          getPostCaseRequest({
            title: 'case A default',
            severity: CaseSeverity.LOW,
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: {
              case_name_as_keyword: 'Case A mapped',
              priority_as_keyword: 'P1',
            },
          }),
          getPostCaseRequest({
            title: 'case B default',
            severity: CaseSeverity.LOW,
            template: { id: template.templateId, version: template.templateVersion },
            [CASE_EXTENDED_FIELDS]: {
              case_name_as_keyword: 'Case B mapped',
              priority_as_keyword: 'P3',
            },
          }),
        ]);

        expect(result.cases).to.have.length(2);

        const caseA = result.cases.find((c) => c.title === 'Case A mapped');
        const caseB = result.cases.find((c) => c.title === 'Case B mapped');

        expect(caseA).to.be.ok();
        expect(caseA!.severity).to.eql(CaseSeverity.CRITICAL);

        expect(caseB).to.be.ok();
        expect(caseB!.severity).to.eql(CaseSeverity.MEDIUM);
      });
    });

    describe('patch (update)', () => {
      it('applies system field mappings when extended_fields are included in the update', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
          {
            name: 'priority',
            control: 'SELECT_BASIC',
            label: 'Priority',
            type: 'keyword',
            system: {
              maps_to: 'severity',
              value_map: { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' },
            },
            metadata: { options: ['P1', 'P2', 'P3', 'P4'] },
          },
        ]);

        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({
            template: { id: template.templateId, version: template.templateVersion },
          })
        );

        const [updatedCase] = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                template: { id: template.templateId, version: template.templateVersion },
                [CASE_EXTENDED_FIELDS]: {
                  case_name_as_keyword: 'Updated via mapping',
                  priority_as_keyword: 'P2',
                },
              },
            ],
          },
        });

        expect(updatedCase.title).to.eql('Updated via mapping');
        expect(updatedCase.severity).to.eql(CaseSeverity.HIGH);
      });

      it('does not apply system field mappings when extended_fields are absent from the update', async () => {
        const template = await createTemplate([
          {
            name: 'case_name',
            control: 'INPUT_TEXT',
            label: 'Case name',
            type: 'keyword',
            system: { maps_to: 'title' },
          },
        ]);

        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({
            title: 'original title',
            template: { id: template.templateId, version: template.templateVersion },
          })
        );

        const [updatedCase] = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                description: 'updated description only',
              },
            ],
          },
        });

        expect(updatedCase.title).to.eql('original title');
      });
    });
  });
};
