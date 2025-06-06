/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { MIGRATION_CLIENT_OPTIONS, REMOVED_TYPES } from './constants';
export { SavedObjectsService } from './saved_objects_service';
export type {
  InternalSavedObjectsServiceStart,
  InternalSavedObjectsServiceSetup,
} from './saved_objects_service';
export { CoreSavedObjectsRouteHandlerContext } from './saved_objects_route_handler_context';
export type {
  InternalSavedObjectsRequestHandlerContext,
  InternalSavedObjectRouter,
} from './internal_types';
export { SAVED_OBJECT_TYPES_COUNT } from './object_types';
