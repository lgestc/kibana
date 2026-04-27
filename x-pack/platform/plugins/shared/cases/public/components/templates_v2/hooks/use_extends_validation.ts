/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { parse } from 'yaml';
import { load as parseYaml } from 'js-yaml';
import { monaco } from '@kbn/monaco';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useGetTemplates } from './use_get_templates';
import { EXTENDS_CHAINING_ERROR, EXTENDS_NOT_FOUND_ERROR } from '../translations';

const EXTENDS_VALIDATION_OWNER = 'extends-validation';

type TemplateItem = { name: string; definition: unknown };

export const useExtendsValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string
) => {
  const { owner } = useCasesContext();
  const { data: templatesData } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner, isEnabled: true },
  });

  const templatesRef = useRef<TemplateItem[]>([]);
  templatesRef.current = (templatesData?.templates as TemplateItem[] | undefined) ?? [];

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateExtends(model, value, templatesRef.current);
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [editor, value, templatesData]);
};

function validateExtends(
  model: monaco.editor.ITextModel,
  yamlContent: string,
  templates: TemplateItem[]
) {
  try {
    const parsed = parse(yamlContent);

    const extendsValue =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).extends : undefined;

    if (!extendsValue || typeof extendsValue !== 'string') {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
      return;
    }

    const location = findExtendsLocation(yamlContent);
    if (!location) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
      return;
    }

    const parentTemplate = templates.find((t) => t.name === extendsValue);

    if (!parentTemplate) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, [
        {
          ...location,
          severity: 8,
          message: EXTENDS_NOT_FOUND_ERROR(extendsValue),
          source: EXTENDS_VALIDATION_OWNER,
        },
      ]);
      return;
    }

    try {
      const raw = parentTemplate.definition;
      const parentDef = typeof raw === 'string' ? parseYaml(raw) : raw;
      const result = ParsedTemplateDefinitionSchema.safeParse(parentDef);
      if (result.success && result.data.extends) {
        monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, [
          {
            ...location,
            severity: 8,
            message: EXTENDS_CHAINING_ERROR,
            source: EXTENDS_VALIDATION_OWNER,
          },
        ]);
        return;
      }
    } catch {
      // Can't parse parent — skip chaining check
    }

    monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
  } catch {
    monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
  }
}

function findExtendsLocation(
  yamlContent: string
): Pick<
  monaco.editor.IMarkerData,
  'startLineNumber' | 'startColumn' | 'endLineNumber' | 'endColumn'
> | null {
  const lines = yamlContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^extends:\s*(\S.*?)\s*(?:#.*)?$/);
    if (!match) continue;

    const rawValue = match[1];
    const valueStart = line.indexOf(rawValue, 'extends:'.length);
    if (valueStart === -1) continue;

    return {
      startLineNumber: i + 1,
      startColumn: valueStart + 1,
      endLineNumber: i + 1,
      endColumn: valueStart + rawValue.length + 1,
    };
  }
  return null;
}
