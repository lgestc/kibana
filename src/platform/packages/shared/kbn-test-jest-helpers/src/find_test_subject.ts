/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReactWrapper } from 'enzyme';

type Matcher = '=' | '~=' | '|=' | '^=' | '$=' | '*=';

const MATCHERS: Matcher[] = [
  '=', // Exact match
  '~=', // Exists in a space-separated list
  '|=', // Begins with substring, followed by '-'
  '^=', // Begins with substring
  '$=', // Ends with substring
  '*=',
];

/**
 * @deprecated - use '@testing-library/react' and byId query instead.
 *
 * Find node which matches a specific test subject selector. Returns ReactWrappers around DOM element,
 * https://github.com/airbnb/enzyme/tree/master/docs/api/ReactWrapper.
 * Common use cases include calling simulate or getDOMNode on the returned ReactWrapper.
 *
 * The ~= matcher looks for the value in space-separated list, allowing support for multiple data-test-subj
 * values on a single element. See https://www.w3.org/TR/selectors-3/#attribute-selectors for more
 * info on the other possible matchers.
 *
 * @param reactWrapper The React wrapper to search in
 * @param testSubjectSelector The data test subject selector
 * @param matcher optional matcher
 */
export const findTestSubject = <T = string>(
  reactWrapper: ReactWrapper,
  testSubjectSelector: T,
  matcher: Matcher = '~='
) => {
  if (!MATCHERS.includes(matcher)) {
    throw new Error(
      'Matcher '
        .concat(matcher, ' not found in list of allowed matchers: ')
        .concat(MATCHERS.join(' '))
    );
  }

  const testSubject = reactWrapper.find(`[data-test-subj${matcher}"${testSubjectSelector}"]`);
  // Restores Enzyme 2's find behavior, which was to only return ReactWrappers around DOM elements.
  // Enzyme 3 returns ReactWrappers around both DOM elements and React components.
  // https://github.com/airbnb/enzyme/issues/1174

  return testSubject.hostNodes();
};
