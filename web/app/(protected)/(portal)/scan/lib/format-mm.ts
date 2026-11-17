// Widths stay exact everywhere (API, median, steadiness); they're rounded only here, when shown or put in the form
const MM_DECIMALS = 2;

export const formatMm = (mm: number) => mm.toFixed(MM_DECIMALS);

// A scale is well under 1 mm/px, so 2 decimals would hide it (0.2646 would show as 0.26); scales show 4
const SCALE_DECIMALS = 4;

export const formatScale = (mmPerPx: number) => mmPerPx.toFixed(SCALE_DECIMALS);
