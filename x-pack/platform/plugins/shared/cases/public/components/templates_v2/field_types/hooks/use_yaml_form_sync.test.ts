/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { useYamlFormSync } from './use_yaml_form_sync';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';

describe('useYamlFormSync', () => {
  let mockForm: jest.Mocked<Pick<UseFormReturn, 'setValue' | 'watch'>>;
  let mockSubscriptionCallback: (data: Record<string, unknown>) => void;
  let mockUnsubscribe: jest.Mock;

  const createMockForm = () => {
    mockUnsubscribe = jest.fn();
    return {
      setValue: jest.fn(),
      watch: jest.fn((callback) => {
        mockSubscriptionCallback = callback;
        return { unsubscribe: mockUnsubscribe };
      }),
    } as unknown as jest.Mocked<Pick<UseFormReturn, 'setValue' | 'watch'>>;
  };

  const createParsedFields = (
    fields: Array<{
      name: string;
      type: string;
      control: string;
      defaultValue?: string | number;
    }>
  ) =>
    fields.map((f) => ({
      name: f.name,
      type: f.type,
      control: f.control,
      metadata: f.defaultValue !== undefined ? { default: f.defaultValue } : undefined,
    }));

  beforeEach(() => {
    jest.useFakeTimers();
    mockForm = createMockForm();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('YAML to form sync', () => {
    it('sets form field values from parsed fields on mount', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default text' },
        { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 42 },
      ]);

      renderHook(() => useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields));

      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Default text'
      );
      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.count_as_integer`,
        '42'
      );
    });

    it('converts number defaults to strings', () => {
      const parsedFields = createParsedFields([
        { name: 'effort', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 100 },
      ]);

      renderHook(() => useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields));

      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.effort_as_integer`,
        '100'
      );
    });

    it('sets empty string for fields without default', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() => useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields));

      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        ''
      );
    });

    it('updates form fields when parsedFields change', () => {
      const initialFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      const { rerender } = renderHook(
        ({ fields }) => useYamlFormSync(mockForm as unknown as UseFormReturn, fields),
        {
          initialProps: { fields: initialFields },
        }
      );

      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Initial'
      );

      const updatedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Updated' },
      ]);

      rerender({ fields: updatedFields });

      expect(mockForm.setValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Updated'
      );
    });
  });

  describe('form to YAML sync', () => {
    it('subscribes to form changes', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() => useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields));

      expect(mockForm.watch).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      const { unmount } = renderHook(() =>
        useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields)
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('calls onFieldDefaultChange when form value differs from YAML value', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Original' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      // Wait for syncingFromYamlRef to be reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form change
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'User typed value',
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'summary',
        'User typed value',
        'INPUT_TEXT'
      );
    });

    it('does not call onFieldDefaultChange when form value matches YAML value', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Same value' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      // Wait for syncingFromYamlRef to be reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form reporting the same value as YAML
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'Same value',
          },
        });
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('does not call onFieldDefaultChange when syncing from YAML', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'YAML value' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      // Do NOT advance timers - syncingFromYamlRef is still true
      // Simulate form change while syncing
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'Different value',
          },
        });
      });

      // Should not be called because we're still syncing from YAML
      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });
  });

  describe('feedback loop prevention', () => {
    it('prevents feedback loop by ignoring form changes during YAML sync', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      // Simulate subscription firing immediately after setValue (before setTimeout callback)
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'Initial',
          },
        });
      });

      // Should not trigger callback during sync
      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();

      // Now advance timers to allow sync flag to reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Now form changes should trigger callback
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'User changed',
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'summary',
        'User changed',
        'INPUT_TEXT'
      );
    });
  });

  describe('return value', () => {
    it('returns current yamlDefaults', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default' },
        { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 5 },
      ]);

      const { result } = renderHook(() =>
        useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields)
      );

      expect(result.current.yamlDefaults).toEqual({
        summary: 'Default',
        count: '5',
      });
    });

    it('updates yamlDefaults when parsedFields change', () => {
      const initialFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      const { result, rerender } = renderHook(
        ({ fields }) => useYamlFormSync(mockForm as unknown as UseFormReturn, fields),
        {
          initialProps: { fields: initialFields },
        }
      );

      expect(result.current.yamlDefaults.summary).toBe('Initial');

      const updatedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Updated' },
      ]);

      rerender({ fields: updatedFields });

      expect(result.current.yamlDefaults.summary).toBe('Updated');
    });
  });

  describe('edge cases', () => {
    it('handles empty parsedFields array', () => {
      const { result } = renderHook(() =>
        useYamlFormSync(mockForm as unknown as UseFormReturn, [])
      );

      expect(mockForm.setValue).not.toHaveBeenCalled();
      expect(result.current.yamlDefaults).toEqual({});
    });

    it('handles undefined onFieldDefaultChange callback', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Value' },
      ]);

      renderHook(() =>
        useYamlFormSync(mockForm as unknown as UseFormReturn, parsedFields, undefined)
      );

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Should not throw when callback is undefined
      expect(() => {
        act(() => {
          mockSubscriptionCallback({
            [CASE_EXTENDED_FIELDS]: {
              summary_as_keyword: 'Changed',
            },
          });
        });
      }).not.toThrow();
    });

    it('handles missing extendedFields in form data', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form data without extendedFields
      act(() => {
        mockSubscriptionCallback({});
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('handles null and undefined default values', () => {
      const parsedFields = [
        { name: 'field1', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: null } },
        {
          name: 'field2',
          type: 'keyword',
          control: 'INPUT_TEXT',
          metadata: { default: undefined },
        },
        { name: 'field3', type: 'keyword', control: 'INPUT_TEXT', metadata: undefined },
      ];

      const { result } = renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields as Parameters<typeof useYamlFormSync>[1]
        )
      );

      expect(result.current.yamlDefaults).toEqual({
        field1: '',
        field2: '',
        field3: '',
      });
    });

    it('handles multiple fields with different controls', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'text', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
        { name: 'number', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 10 },
        { name: 'area', type: 'keyword', control: 'TEXTAREA', defaultValue: 'area' },
        { name: 'select', type: 'keyword', control: 'SELECT_BASIC', defaultValue: 'option1' },
      ]);

      renderHook(() =>
        useYamlFormSync(
          mockForm as unknown as UseFormReturn,
          parsedFields,
          mockOnFieldDefaultChange
        )
      );

      expect(mockForm.setValue).toHaveBeenCalledTimes(4);

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Change the number field
      act(() => {
        mockSubscriptionCallback({
          [CASE_EXTENDED_FIELDS]: {
            text_as_keyword: 'text',
            number_as_integer: '20',
            area_as_keyword: 'area',
            select_as_keyword: 'option1',
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith('number', '20', 'INPUT_NUMBER');
      expect(mockOnFieldDefaultChange).toHaveBeenCalledTimes(1);
    });
  });
});
