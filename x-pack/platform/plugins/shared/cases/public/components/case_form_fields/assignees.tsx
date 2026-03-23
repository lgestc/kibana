/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, differenceWith } from 'lodash';
import React, { memo, useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiComboBox,
  EuiFormRow,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { CaseAssignees } from '../../../common/types/domain';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from '../create/translations';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';

interface Props {
  value: CaseAssignees;
  onChange: (v: CaseAssignees) => void;
  isLoading: boolean;
  isInvalid?: boolean;
  error?: string;
}

type UserProfileComboBoxOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const userProfileToComboBoxOption = (userProfile: UserProfileWithAvatar) => ({
  label: getUserDisplayName(userProfile.user),
  value: userProfile.uid,
  key: userProfile.uid,
  user: userProfile.user,
  data: userProfile.data,
});

const comboBoxOptionToAssignee = (option: EuiComboBoxOptionOption<string>) => ({
  uid: option.value ?? '',
});

const AssigneesComponent: React.FC<Props> = ({
  value: selectedAssignees,
  onChange,
  isLoading: isLoadingForm,
  isInvalid = false,
  error,
}) => {
  const { owner: owners } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const hasOwners = owners.length > 0;

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const {
    data: userProfiles = [],
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const assigneesWithoutProfiles = differenceWith(
    selectedAssignees ?? [],
    userProfiles ?? [],
    (assignee, userProfile) => assignee.uid === userProfile.uid
  );

  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({ uids: assigneesWithoutProfiles.map((assignee) => assignee.uid) });

  const bulkUserProfilesAsArray = Array.from(bulkUserProfiles).map(([_, profile]) => profile);

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, [
      ...userProfiles,
      ...bulkUserProfilesAsArray,
    ])?.map((userProfile) => userProfileToComboBoxOption(userProfile)) ?? [];

  const isLoading =
    isLoadingForm ||
    isLoadingCurrentUserProfile ||
    isLoadingBulkGetUserProfiles ||
    isLoadingSuggest ||
    isFetchingSuggest ||
    isUserTyping;

  const isDisabled = isLoadingForm || isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles;

  const selectedOptions = (selectedAssignees ?? []).flatMap(({ uid }) => {
    const opt = options.find((userProfile) => userProfile.key === uid);
    return opt ? [opt] : [];
  }) as UserProfileComboBoxOption[];

  const onComboChange = useCallback(
    (currentOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newValue = currentOptions.map((option) => comboBoxOptionToAssignee(option));
      if (newValue.length > MAX_ASSIGNEES_PER_CASE) return;
      onChange(newValue);
    },
    [onChange]
  );

  const onSelfAssign = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }
    onChange([...(selectedAssignees ?? []), { uid: currentUserProfile.uid }]);
  }, [currentUserProfile, selectedAssignees, onChange]);

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string, contentClassName: string) => {
      const { user, data } = option as UserProfileComboBoxOption;

      const displayName = getUserDisplayName(user);

      return (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <UserAvatar user={user} avatar={data.avatar} size="s" />
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiHighlight search={searchValue} className={contentClassName}>
                {displayName}
              </EuiHighlight>
            </EuiFlexItem>
            {user.email && user.email !== displayName ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={'subdued'}>
                  <EuiHighlight search={searchValue} className={contentClassName}>
                    {user.email}
                  </EuiHighlight>
                </EuiTextColor>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    },
    []
  );

  const isCurrentUserSelected = Boolean(
    (selectedAssignees ?? []).find((assignee) => assignee.uid === currentUserProfile?.uid)
  );

  const onSearchComboChange = (value: string) => {
    if (!isEmpty(value)) {
      setSearchTerm(value);
    }
    onContentChange(value);
  };

  return (
    <EuiFormRow
      id="createCaseAssignees"
      fullWidth
      label={i18n.ASSIGNEES}
      labelAppend={OptionalFieldLabel}
      helpText={
        currentUserProfile ? (
          <EuiLink
            data-test-subj="create-case-assign-yourself-link"
            onClick={onSelfAssign}
            disabled={isCurrentUserSelected}
          >
            {i18n.ASSIGN_YOURSELF}
          </EuiLink>
        ) : undefined
      }
      isInvalid={isInvalid}
      error={error}
      data-test-subj="caseAssignees"
    >
      <EuiComboBox
        isInvalid={isInvalid}
        fullWidth
        async
        isLoading={isLoading}
        options={options}
        data-test-subj="createCaseAssigneesComboBox"
        selectedOptions={selectedOptions}
        isDisabled={isDisabled}
        onChange={onComboChange}
        onSearchChange={onSearchComboChange}
        renderOption={renderOption}
        rowHeight={35}
      />
    </EuiFormRow>
  );
};

AssigneesComponent.displayName = 'AssigneesComponent';

export const Assignees = memo(AssigneesComponent);
