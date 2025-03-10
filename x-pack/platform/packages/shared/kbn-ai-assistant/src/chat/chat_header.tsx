/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { ChatActionsMenu } from './chat_actions_menu';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { FlyoutPositionMode } from './chat_flyout';

// needed to prevent InlineTextEdit component from expanding container
const minWidthClassName = css`
  min-width: 0;
`;

const chatHeaderClassName = css`
  padding-top: 12px;
  padding-bottom: 12px;
`;

const chatHeaderMobileClassName = css`
  padding-top: 8px;
  padding-bottom: 8px;
`;

export function ChatHeader({
  connectors,
  conversationId,
  flyoutPositionMode,
  licenseInvalid,
  loading,
  title,
  isConversationOwnedByCurrentUser,
  onCopyConversation,
  onDuplicateConversation,
  onSaveTitle,
  onToggleFlyoutPositionMode,
  navigateToConversation,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  flyoutPositionMode?: FlyoutPositionMode;
  licenseInvalid: boolean;
  loading: boolean;
  title: string;
  isConversationOwnedByCurrentUser: boolean;
  onCopyConversation: () => void;
  onDuplicateConversation: () => void;
  onSaveTitle: (title: string) => void;
  onToggleFlyoutPositionMode?: (newFlyoutPositionMode: FlyoutPositionMode) => void;
  navigateToConversation?: (nextConversationId?: string) => void;
}) {
  const theme = useEuiTheme();
  const breakpoint = useCurrentEuiBreakpoint();

  const [newTitle, setNewTitle] = useState(title);

  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const handleToggleFlyoutPositionMode = () => {
    if (flyoutPositionMode) {
      onToggleFlyoutPositionMode?.(
        flyoutPositionMode === FlyoutPositionMode.OVERLAY
          ? FlyoutPositionMode.PUSH
          : FlyoutPositionMode.OVERLAY
      );
    }
  };

  return (
    <EuiPanel
      borderRadius="none"
      className={breakpoint === 'xs' ? chatHeaderMobileClassName : chatHeaderClassName}
      hasBorder={false}
      hasShadow={false}
      paddingSize={breakpoint === 'xs' ? 's' : 'm'}
    >
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          {loading ? (
            <EuiLoadingSpinner size={breakpoint === 'xs' ? 'm' : 'l'} />
          ) : (
            <AssistantIcon size={breakpoint === 'xs' ? 'm' : 'l'} />
          )}
        </EuiFlexItem>

        <EuiFlexItem grow className={minWidthClassName}>
          <EuiInlineEditTitle
            heading="h2"
            size={breakpoint === 'xs' ? 'xs' : 's'}
            value={newTitle}
            className={css`
              color: ${!!title
                ? theme.euiTheme.colors.textParagraph
                : theme.euiTheme.colors.textSubdued};
            `}
            inputAriaLabel={i18n.translate('xpack.aiAssistant.chatHeader.editConversationInput', {
              defaultMessage: 'Edit conversation',
            })}
            isReadOnly={
              !conversationId ||
              !connectors.selectedConnector ||
              licenseInvalid ||
              !Boolean(onSaveTitle) ||
              !isConversationOwnedByCurrentUser
            }
            onChange={(e) => {
              setNewTitle(e.currentTarget.nodeValue || '');
            }}
            onSave={(e) => {
              if (onSaveTitle) {
                onSaveTitle(e);
              }
            }}
            onCancel={() => {
              setNewTitle(title);
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {flyoutPositionMode && onToggleFlyoutPositionMode ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    anchorPosition="downLeft"
                    button={
                      <EuiToolTip
                        content={
                          flyoutPositionMode === 'overlay'
                            ? i18n.translate(
                                'xpack.aiAssistant.chatHeader.euiToolTip.flyoutModeLabel.dock',
                                { defaultMessage: 'Dock conversation' }
                              )
                            : i18n.translate(
                                'xpack.aiAssistant.chatHeader.euiToolTip.flyoutModeLabel.undock',
                                { defaultMessage: 'Undock conversation' }
                              )
                        }
                        display="block"
                      >
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.aiAssistant.chatHeader.euiButtonIcon.toggleFlyoutModeLabel',
                            { defaultMessage: 'Toggle flyout mode' }
                          )}
                          data-test-subj="observabilityAiAssistantChatHeaderButton"
                          iconType={flyoutPositionMode === 'overlay' ? 'menuRight' : 'menuLeft'}
                          onClick={handleToggleFlyoutPositionMode}
                        />
                      </EuiToolTip>
                    }
                  />
                </EuiFlexItem>
                {navigateToConversation ? (
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      anchorPosition="downLeft"
                      button={
                        <EuiToolTip
                          content={i18n.translate(
                            'xpack.aiAssistant.chatHeader.euiToolTip.navigateToConversationsLabel',
                            { defaultMessage: 'Navigate to conversations' }
                          )}
                          display="block"
                        >
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.aiAssistant.chatHeader.euiButtonIcon.navigateToConversationsLabel',
                              { defaultMessage: 'Navigate to conversations' }
                            )}
                            data-test-subj="observabilityAiAssistantChatHeaderButton"
                            iconType="discuss"
                            onClick={() => navigateToConversation(conversationId)}
                          />
                        </EuiToolTip>
                      }
                    />
                  </EuiFlexItem>
                ) : null}
              </>
            ) : null}

            <EuiFlexItem grow={false}>
              <ChatActionsMenu
                connectors={connectors}
                conversationId={conversationId}
                disabled={licenseInvalid}
                onCopyConversationClick={onCopyConversation}
                onDuplicateConversationClick={onDuplicateConversation}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
