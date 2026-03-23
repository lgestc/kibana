/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useTimelineContext } from '../timeline_context/use_timeline_context';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export const InsertTimeline: React.FC<Props> = ({ value, onChange }) => {
  const timelineHooks = useTimelineContext()?.hooks;
  const onTimelineAttached = useCallback((newValue: string) => onChange(newValue), [onChange]);
  timelineHooks?.useInsertTimeline(value, onTimelineAttached);
  return null;
};

InsertTimeline.displayName = 'InsertTimeline';
