/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { deleteAllCaseItems, createCase } from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';

const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';
const APPLICABLE_FIELDS_URL = `${CASES_URL}/fields`;
const OWNER = 'securitySolutionFixture';

const buildFieldDef = (name: string, type = 'keyword', isGlobal = true) => ({
  name,
  owner: OWNER,
  isGlobal,
  definition: yamlStringify({ name, type, control: 'INPUT_TEXT', label: name }),
});

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const getPublic = (path: string) =>
    supertest
      .get(path)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo')
      .set('elastic-api-version', '2023-10-31');

  const createTemplate = async (fields: Array<Record<string, unknown>>) => {
    const { body } = await supertest
      .post('/internal/cases/templates')
      .set('kbn-xsrf', 'true')
      .send({
        name: 'Test Template',
        owner: OWNER,
        definition: yamlStringify({ name: 'Test Template', fields }),
        isEnabled: true,
      })
      .expect(200);
    return body;
  };

  describe('applicable fields — public discovery API', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('GET /api/cases/fields (pre-create discovery)', () => {
      it('returns the owner global fields when no template is provided', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('risk_score'))
          .expect(200);

        const { body } = await getPublic(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}`).expect(200);

        const riskScore = body.fields.find(
          (f: { key: string }) => f.key === 'risk_score_as_keyword'
        );
        expect(riskScore).to.be.ok();
        expect(riskScore.source).to.eql('global');
        expect(riskScore.isGlobal).to.eql(true);
        expect(riskScore.displayOnly).to.eql(false);
      });

      it('returns global + template fields and flags MARKDOWN as displayOnly when a template is provided', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('global_tag'))
          .expect(200);

        const template = await createTemplate([
          { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', label: 'Summary' },
          { name: 'instructions', control: 'MARKDOWN', metadata: { content: '# Read me' } },
        ]);

        const { body } = await getPublic(
          `${APPLICABLE_FIELDS_URL}?owner=${OWNER}&templateId=${template.templateId}`
        ).expect(200);

        const keys = body.fields.map((f: { key: string }) => f.key);
        expect(keys).to.contain('global_tag_as_keyword');
        expect(keys).to.contain('summary_as_keyword');

        const markdown = body.fields.find(
          (f: { key: string }) => f.key === 'instructions_as_keyword'
        );
        expect(markdown.displayOnly).to.eql(true);
        expect(markdown.source).to.eql('template');
      });

      it('returns 400 for an unknown template', async () => {
        await getPublic(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}&templateId=does-not-exist`).expect(
          400
        );
      });

      it('returns 400 when owner is omitted', async () => {
        await getPublic(APPLICABLE_FIELDS_URL).expect(400);
      });
    });

    describe('GET /api/cases/{case_id}/fields (existing-case discovery)', () => {
      it('reflects the template applied to the case', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('global_tag'))
          .expect(200);

        const template = await createTemplate([
          { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', label: 'Summary' },
        ]);

        const createdCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId, version: template.templateVersion },
        });

        const { body } = await getPublic(`${CASES_URL}/${createdCase.id}/fields`).expect(200);

        const keys = body.fields.map((f: { key: string }) => f.key);
        expect(keys).to.contain('global_tag_as_keyword');
        expect(keys).to.contain('summary_as_keyword');
      });

      it('returns 404 for a missing case', async () => {
        await getPublic(`${CASES_URL}/does-not-exist/fields`).expect(404);
      });
    });
  });
};
