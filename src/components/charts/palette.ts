/** Chosen to stay distinguishable on both the light and dark surfaces. */
export const CATEGORY_COLORS = [
  "#0f5f56", "#b3453a", "#a86a12", "#2f6f9f", "#6b4f9e",
  "#1f7a53", "#9a5b8c", "#4a6572", "#8a7a2c", "#3f7f7a", "#7a4a3a",
];

export const colorFor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];
