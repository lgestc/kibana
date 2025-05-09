/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiImage, EuiToolTip } from '@elastic/eui';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { AGENT_NAMES } from '@kbn/elastic-agent-utils';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { getAgentIcon } from './get_agent_icon';
import { AgentIcon } from '.';

export default {
  title: 'Custom Icons/AgentIcon',
  component: AgentIcon,
};

export const List: StoryFn = () => {
  return (
    <EuiThemeProvider darkMode={false}>
      <EuiFlexGroup gutterSize="l" wrap={true}>
        {AGENT_NAMES.map((agentName) => {
          return (
            <EuiFlexItem key={agentName} grow={false}>
              <EuiCard
                icon={
                  <EuiToolTip position="top" content="Icon rendered with `EuiImage`">
                    <EuiImage
                      size="s"
                      hasShadow
                      alt={agentName}
                      src={getAgentIcon(agentName, false)}
                    />
                  </EuiToolTip>
                }
                title={agentName}
                description={
                  <EuiToolTip position="bottom" content="Icon rendered with `AgentIcon`">
                    <AgentIcon agentName={agentName} />
                  </EuiToolTip>
                }
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiThemeProvider>
  );
};
