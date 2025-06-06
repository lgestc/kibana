/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSelect,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import type { SyntheticEvent } from 'react';
import React, { useState, useCallback, useEffect } from 'react';
import { first, last } from 'lodash';
import type { EuiRangeProps, EuiSelectProps } from '@elastic/eui';
import type { WaffleLegendOptions } from '../../hooks/use_waffle_options';
import {
  type InfraWaffleMapBounds,
  type InventoryColorPalette,
  PALETTES,
} from '../../../../../common/inventory/types';
import { getColorPalette } from '../../lib/get_color_palette';
import { convertBoundsToPercents } from '../../lib/convert_bounds_to_percents';
import { ColorLabel } from './color_label';
import { PalettePreview } from './palette_preview';

interface Props {
  onChange: (options: {
    auto: boolean;
    bounds: InfraWaffleMapBounds;
    legend: WaffleLegendOptions;
  }) => void;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  autoBounds: boolean;
  boundsOverride: InfraWaffleMapBounds;
  options: WaffleLegendOptions;
}

const PALETTE_NAMES: InventoryColorPalette[] = [
  'temperature',
  'status',
  'cool',
  'warm',
  'positive',
  'negative',
];

const PALETTE_OPTIONS = PALETTE_NAMES.map((name) => ({ text: PALETTES[name], value: name }));

export const LegendControls = ({
  autoBounds,
  boundsOverride,
  onChange,
  dataBounds,
  options,
}: Props) => {
  const [isPopoverOpen, setPopoverState] = useState(false);
  const [draftAuto, setDraftAuto] = useState(autoBounds);
  const [draftLegend, setLegendOptions] = useState(options);
  const [draftBounds, setDraftBounds] = useState(convertBoundsToPercents(boundsOverride)); // should come from bounds prop

  useEffect(() => {
    if (draftAuto) {
      setDraftBounds(convertBoundsToPercents(dataBounds));
    }
  }, [autoBounds, dataBounds, draftAuto, onChange, options]);

  const buttonComponent = (
    <EuiButtonIcon
      iconType="color"
      color="text"
      display="base"
      size="s"
      aria-label={i18n.translate('xpack.infra.legendControls.buttonLabel', {
        defaultMessage: 'configure legend',
      })}
      onClick={() => setPopoverState(true)}
      data-test-subj="openLegendControlsButton"
    />
  );

  const handleAutoChange = useCallback(
    (e: EuiSwitchEvent) => {
      const auto = e.target.checked;
      setDraftAuto(auto);
      if (!auto) {
        setDraftBounds(convertBoundsToPercents(boundsOverride));
      }
    },
    [boundsOverride]
  );

  const handleReverseColors = useCallback(
    (e: EuiSwitchEvent) => {
      setLegendOptions((previous) => ({ ...previous, reverseColors: e.target.checked }));
    },
    [setLegendOptions]
  );

  const handleMaxBounds = useCallback(
    (e: SyntheticEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value);
      // Auto correct the max to be one larger then the min OR 100
      const max = value <= draftBounds.min ? draftBounds.min + 1 : value > 100 ? 100 : value;
      setDraftBounds({ ...draftBounds, max });
    },
    [draftBounds]
  );

  const handleMinBounds = useCallback(
    (e: SyntheticEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value);
      // Auto correct the min to be one smaller then the max OR ZERO
      const min = value >= draftBounds.max ? draftBounds.max - 1 : value < 0 ? 0 : value;
      setDraftBounds({ ...draftBounds, min });
    },
    [draftBounds]
  );

  const handleApplyClick = useCallback(() => {
    onChange({
      auto: draftAuto,
      bounds: { min: draftBounds.min / 100, max: draftBounds.max / 100 },
      legend: draftLegend,
    });
    setPopoverState(false);
  }, [onChange, draftAuto, draftBounds, draftLegend]);

  const handleCancelClick = useCallback(() => {
    setDraftBounds(convertBoundsToPercents(boundsOverride));
    setDraftAuto(autoBounds);
    setLegendOptions(options);
    setPopoverState(false);
  }, [autoBounds, boundsOverride, options]);

  const handleStepsChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (e) => {
      const steps = parseInt((e.target as HTMLInputElement).value, 10);
      setLegendOptions((previous) => ({ ...previous, steps }));
    },
    [setLegendOptions]
  );

  const handlePaletteChange = useCallback<NonNullable<EuiSelectProps['onChange']>>(
    (e) => {
      const palette = e.target.value as WaffleLegendOptions['palette'];
      setLegendOptions((previous) => ({ ...previous, palette }));
    },
    [setLegendOptions]
  );

  const commited =
    draftAuto === autoBounds &&
    boundsOverride.min * 100 === draftBounds.min &&
    boundsOverride.max * 100 === draftBounds.max &&
    options.steps === draftLegend.steps &&
    options.reverseColors === draftLegend.reverseColors &&
    options.palette === draftLegend.palette;

  const boundsValidRange = draftBounds.min < draftBounds.max;
  const paletteColors = getColorPalette(
    draftLegend.palette,
    draftLegend.steps,
    draftLegend.reverseColors
  );
  const errors = !boundsValidRange
    ? [
        i18n.translate('xpack.infra.legendControls.boundRangeError', {
          defaultMessage: 'Minimum must be smaller than the maximum',
        }),
      ]
    : [];

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={handleCancelClick}
      id="legendControls"
      button={buttonComponent}
      anchorPosition="leftCenter"
      data-test-subj="legendControls"
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.infra.legendControls.legendOptionsPopoverTitleLabel', {
          defaultMessage: 'Legend Options',
        })}
      </EuiPopoverTitle>
      <StyledEuiForm>
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.infra.legendControls.colorPaletteLabel', {
            defaultMessage: 'Color palette',
          })}
        >
          <>
            <EuiSelect
              aria-label={i18n.translate('xpack.infra.legendControls.colorPalette.ariaLabel', {
                defaultMessage: 'Color palette selection',
              })}
              options={PALETTE_OPTIONS}
              value={draftLegend.palette}
              id="palette"
              onChange={handlePaletteChange}
              compressed
              data-test-subj="legendControlsPalette"
            />
            <EuiSpacer size="m" />
            <PalettePreview
              palette={draftLegend.palette}
              steps={draftLegend.steps}
              reverse={draftLegend.reverseColors}
            />
          </>
        </EuiFormRow>
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.infra.legendControls.stepsLabel', {
            defaultMessage: 'Number of colors',
          })}
        >
          <EuiRange
            id="steps"
            min={2}
            max={18}
            step={1}
            value={draftLegend.steps}
            onChange={handleStepsChange}
            showValue
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          display="columnCompressed"
          label={i18n.translate('xpack.infra.legendControls.reverseDirectionLabel', {
            defaultMessage: 'Reverse direction',
          })}
        >
          <EuiSwitch
            showLabel={false}
            name="reverseColors"
            label={i18n.translate('xpack.infra.legendControls.euiSwitch.reversecolorsLabel', {
              defaultMessage: 'Reverse colors direction',
            })}
            checked={draftLegend.reverseColors}
            onChange={handleReverseColors}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          display="columnCompressed"
          label={i18n.translate('xpack.infra.legendControls.switchLabel', {
            defaultMessage: 'Auto calculate range',
          })}
        >
          <EuiSwitch
            showLabel={false}
            name="bounds"
            label={i18n.translate('xpack.infra.legendControls.euiSwitch.boundsLabel', {
              defaultMessage: 'Auto calculate range',
            })}
            checked={draftAuto}
            onChange={handleAutoChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <ColorLabel
              paletteSelected={draftLegend.palette}
              color={first(paletteColors)!}
              label={i18n.translate('xpack.infra.legendControls.minLabel', {
                defaultMessage: 'Minimum',
              })}
            />
          }
          isInvalid={!boundsValidRange}
          display="columnCompressed"
          error={errors}
        >
          <div style={{ maxWidth: 150 }}>
            <EuiFieldNumber
              data-test-subj="infraLegendControlsFieldNumber"
              disabled={draftAuto}
              step={1}
              value={isNaN(draftBounds.min) ? '' : draftBounds.min}
              isInvalid={!boundsValidRange}
              name="legendMin"
              onChange={handleMinBounds}
              append="%"
              compressed
            />
          </div>
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          display="columnCompressed"
          label={
            <ColorLabel
              paletteSelected={draftLegend.palette}
              color={last(paletteColors)!}
              label={i18n.translate('xpack.infra.legendControls.maxLabel', {
                defaultMessage: 'Maximum',
              })}
            />
          }
          isInvalid={!boundsValidRange}
          error={errors}
        >
          <div style={{ maxWidth: 150 }}>
            <EuiFieldNumber
              data-test-subj="infraLegendControlsFieldNumber"
              disabled={draftAuto}
              step={1}
              isInvalid={!boundsValidRange}
              value={isNaN(draftBounds.max) ? '' : draftBounds.max}
              name="legendMax"
              onChange={handleMaxBounds}
              append="%"
              compressed
            />
          </div>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={i18n.translate('xpack.infra.legendControls.cancelButton.ariaLabel', {
                defaultMessage: 'Cancel',
              })}
              data-test-subj="infraLegendControlsCancelButton"
              type="submit"
              size="s"
              onClick={handleCancelClick}
            >
              <FormattedMessage
                id="xpack.infra.legendControls.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              size="s"
              fill
              disabled={commited || !boundsValidRange}
              onClick={handleApplyClick}
              data-test-subj="applyLegendControlsButton"
            >
              <FormattedMessage
                id="xpack.infra.legendControls.applyButton"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StyledEuiForm>
    </EuiPopover>
  );
};

const StyledEuiForm = styled(EuiForm)`
  min-width: 400px;
  @media (max-width: 480px) {
    min-width: 100%;
    max-width: 100%;
    width: 100vw;
  }
`;
