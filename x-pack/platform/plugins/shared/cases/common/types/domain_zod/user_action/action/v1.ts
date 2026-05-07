/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const UserActionTypes = {
  assignees: 'assignees',
  comment: 'comment',
  connector: 'connector',
  description: 'description',
  pushed: 'pushed',
  tags: 'tags',
  title: 'title',
  status: 'status',
  settings: 'settings',
  severity: 'severity',
  create_case: 'create_case',
  delete_case: 'delete_case',
  category: 'category',
  customFields: 'customFields',
  observables: 'observables',
  extended_fields: 'extended_fields',
  template: 'template',
} as const;

type UserActionActionTypeKeys = keyof typeof UserActionTypes;
export type UserActionType = (typeof UserActionTypes)[UserActionActionTypeKeys];

export const UserActionActions = {
  add: 'add',
  create: 'create',
  delete: 'delete',
  update: 'update',
  push_to_service: 'push_to_service',
} as const;

export type UserActionAction = (typeof UserActionActions)[keyof typeof UserActionActions];

export const UserActionActionsSchema = z.enum(
  Object.values(UserActionActions) as [string, ...string[]]
);
