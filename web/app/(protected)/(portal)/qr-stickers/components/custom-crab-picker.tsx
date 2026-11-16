'use client';

import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { getGroupCrabs, pluralize } from '../lib/sticker-sheet';

import type { Crab } from '../types/qr-stickers';

export type CrabSelection = {
  groups: string[];
  crabIds: number[];
};

type CustomCrabPickerProps = {
  crabs: Crab[];
  groups: string[];
  selection: CrabSelection;
  onSelectionChange: (selection: CrabSelection) => void;
};

const ALL_GROUPS = 'all';

const SEGMENT_ITEM_CLASS = 'h-11 flex-1 text-sm data-[state=on]:bg-accent data-[state=on]:font-semibold';

const CRAB_CHIP_CLASS =
  'h-11 min-w-13 rounded-full border-border bg-card px-4 font-mono text-sm font-semibold text-muted-foreground shadow-none data-[state=on]:border-primary/60 data-[state=on]:bg-primary/10 data-[state=on]:text-primary';

const toIds = (crabs: Crab[]) => crabs.map(({ id }) => id);

const CustomCrabPicker = ({ crabs, groups, selection, onSelectionChange }: CustomCrabPickerProps) => {
  const isAllGroups = selection.groups.length === groups.length;
  const shownCrabCount = selection.groups.reduce((total, group) => total + getGroupCrabs(crabs, group).length, 0);

  const selectGroups = (nextGroups: string[]) => {
    const kept = groups.filter((group) => nextGroups.includes(group));
    const added = kept.filter((group) => !selection.groups.includes(group));
    const keptCrabIds = new Set(toIds(kept.flatMap((group) => getGroupCrabs(crabs, group))));
    onSelectionChange({
      groups: kept,
      crabIds: [
        ...selection.crabIds.filter((id) => keptCrabIds.has(id)),
        ...toIds(added.flatMap((group) => getGroupCrabs(crabs, group))),
      ],
    });
  };

  const handleGroupsChange = (values: string[]) => {
    const hasAll = values.includes(ALL_GROUPS);
    if (hasAll && !isAllGroups) return selectGroups(groups);
    if (!hasAll && isAllGroups) return selectGroups([]);
    return selectGroups(values.filter((value) => value !== ALL_GROUPS));
  };

  const toRowValue = (group: string) => {
    const rowIds = new Set(toIds(getGroupCrabs(crabs, group)));
    return selection.crabIds.filter((id) => rowIds.has(id)).map(String);
  };

  const handleRowChange = (group: string, values: string[]) => {
    const rowIds = new Set(toIds(getGroupCrabs(crabs, group)));
    onSelectionChange({
      ...selection,
      crabIds: [...selection.crabIds.filter((id) => !rowIds.has(id)), ...values.map(Number)],
    });
  };

  return (
    <>
      <Field>
        <FieldLabel id="sticker-group-label">Group</FieldLabel>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={isAllGroups ? [ALL_GROUPS, ...selection.groups] : selection.groups}
          onValueChange={handleGroupsChange}
          aria-labelledby="sticker-group-label"
          aria-describedby="sticker-group-hint"
          className="w-full bg-card"
        >
          <ToggleGroupItem value={ALL_GROUPS} className={SEGMENT_ITEM_CLASS}>
            All
          </ToggleGroupItem>
          {groups.map((group) => (
            <ToggleGroupItem key={group} value={group} className={SEGMENT_ITEM_CLASS}>
              {group}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription id="sticker-group-hint">
          {selection.groups.length === 0
            ? 'Pick one or more groups.'
            : `${pluralize(selection.groups.length, 'group')} picked. Tap All to pick or clear every group.`}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel id="sticker-crabs-label">Crabs</FieldLabel>
        {selection.groups.map((group) => (
          <ToggleGroup
            key={group}
            type="multiple"
            variant="outline"
            spacing={2}
            value={toRowValue(group)}
            onValueChange={(values) => handleRowChange(group, values)}
            aria-label={`Group ${group} crabs`}
            aria-describedby="sticker-crabs-hint"
            className="flex-wrap justify-start"
          >
            {getGroupCrabs(crabs, group).map((crab) => (
              <ToggleGroupItem key={crab.id} value={String(crab.id)} className={CRAB_CHIP_CLASS}>
                {crab.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ))}
        <FieldDescription id="sticker-crabs-hint">
          {selection.groups.length === 0
            ? 'Crabs show up here once you pick a group.'
            : `${selection.crabIds.length} of ${shownCrabCount} picked. Tap a crab to leave it out.`}
        </FieldDescription>
      </Field>
    </>
  );
};

export default CustomCrabPicker;
