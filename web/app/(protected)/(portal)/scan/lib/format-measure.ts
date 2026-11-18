// Widths and weights stay exact everywhere (API, median, steadiness); they're rounded only here, when shown or put in the form
const MM_DECIMALS = 2;
const GRAM_DECIMALS = 2;

export const formatMm = (mm: number) => mm.toFixed(MM_DECIMALS);

export const formatGrams = (grams: number) => grams.toFixed(GRAM_DECIMALS);
