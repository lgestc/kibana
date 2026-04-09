/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import yaml from 'js-yaml';

import { CaseStatuses } from '@kbn/cases-components';
import { CASE_EXTENDED_FIELDS, INTERNAL_TEMPLATES_URL } from '@kbn/cases-plugin/common/constants';
import {
  createCase,
  deleteAllCaseItems,
  updateCase,
} from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
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

  const statusField = {
    name: 'state',
    control: 'SELECT_BASIC',
    label: 'State',
    type: 'keyword',
    system: {
      maps_to: 'status',
      value_map: { new: 'open', wip: 'in-progress', done: 'closed' },
    },
    metadata: { options: ['new', 'wip', 'done'] },
  };

  describe('system field mappings', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('patch (update)', () => {
      it('applies status mapping when extended_fields are included in the update', async () => {
        const template = await createTemplate([statusField]);

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
                [CASE_EXTENDED_FIELDS]: { state_as_keyword: 'done' },
              },
            ],
          },
        });

        expect(updatedCase.status).to.eql(CaseStatuses.closed);
      });

      it('does not override status when the extended field value is not in value_map', async () => {
        const template = await createTemplate([statusField]);

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
                [CASE_EXTENDED_FIELDS]: { state_as_keyword: 'unknown' },
              },
            ],
          },
        });

        expect(updatedCase.status).to.eql(CaseStatuses.open);
      });

      it('does not apply status mapping when extended_fields are absent from the update', async () => {
        const template = await createTemplate([statusField]);

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
                description: 'updated description only',
              },
            ],
          },
        });

        expect(updatedCase.status).to.eql(CaseStatuses.open);
      });
    });
  });
};
