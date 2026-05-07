/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The domain template schemas are already zod-native and live alongside
// the io-ts directory. Re-export from there so domain_zod/ is structurally
// complete. PR 2 of the io-ts → zod migration consolidates these locations.
export * from '../../domain/template/v1';
