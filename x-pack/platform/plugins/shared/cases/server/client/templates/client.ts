/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../../../common/types/domain/template/latest';
import type {
  TemplatesFindRequest,
  TemplatesFindResponse,
} from '../../../common/types/api/template/v1';
import type { CasesClientArgs } from '../types';
import { Operations, ReadOperations } from '../../authorization';

/**
 * API for interacting with templates.
 */
export interface TemplatesSubClient {
  getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse>;
  getTemplate(templateId: string, version?: string): Promise<SavedObject<Template> | undefined>;
  createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>>;
  updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
  deleteTemplate(templateId: string): Promise<void>;
  getTags(): Promise<string[]>;
  getAuthors(): Promise<string[]>;
}

/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export const createTemplatesSubClient = (clientArgs: CasesClientArgs): TemplatesSubClient => {
  const { templatesService } = clientArgs.services;
  const { authorization, user } = clientArgs;

  const templatesSubClient: TemplatesSubClient = {
    getAllTemplates: async (params: TemplatesFindRequest) => {
      const { authorizedOwners, ensureSavedObjectsAreAuthorized } =
        await authorization.getAuthorizationFilter(Operations[ReadOperations.FindCases]);

      // Scope the query to only owners the caller is authorized to read.
      // When security is disabled, authorizedOwners is undefined and we use the caller-supplied filter as-is.
      const effectiveOwner = authorizedOwners
        ? params.owner?.length
          ? params.owner.filter((o) => authorizedOwners.includes(o))
          : authorizedOwners
        : params.owner;

      const result = await templatesService.getAllTemplates({ ...params, owner: effectiveOwner });

      ensureSavedObjectsAreAuthorized(
        result.templates.map((t) => ({ owner: t.owner, id: t.templateId }))
      );

      return result;
    },

    getTemplate: async (templateId: string, version?: string) => {
      const existing = await templatesService.getTemplate(templateId, version);

      if (!existing) {
        return existing;
      }

      const { ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
        Operations[ReadOperations.FindCases]
      );
      ensureSavedObjectsAreAuthorized([{ owner: existing.attributes.owner, id: existing.id }]);

      return existing;
    },

    createTemplate: async (input: CreateTemplateInput) => {
      const generatedId = SavedObjectsUtils.generateId();

      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id: generatedId }],
      });

      return templatesService.createTemplate(input, user.username ?? 'unknown', generatedId);
    },

    updateTemplate: async (templateId: string, input: UpdateTemplateInput) => {
      const existing = await templatesService.getTemplate(templateId);

      if (!existing) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }

      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: existing.attributes.owner, id: existing.id }],
      });

      return templatesService.updateTemplate(templateId, input);
    },

    deleteTemplate: async (templateId: string) => {
      const existing = await templatesService.getTemplate(templateId);

      if (!existing) {
        return;
      }

      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: existing.attributes.owner, id: existing.id }],
      });

      return templatesService.deleteTemplate(templateId);
    },

    getTags: async () => {
      const { authorizedOwners } = await authorization.getAuthorizationFilter(
        Operations[ReadOperations.FindCases]
      );
      return templatesService.getTags(authorizedOwners);
    },

    getAuthors: async () => {
      const { authorizedOwners } = await authorization.getAuthorizationFilter(
        Operations[ReadOperations.FindCases]
      );
      return templatesService.getAuthors(authorizedOwners);
    },
  };

  return Object.freeze(templatesSubClient);
};
