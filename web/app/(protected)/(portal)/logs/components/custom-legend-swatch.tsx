type CustomLegendSwatchProps = {
  isDashed: boolean;
};

const CustomLegendSwatch = ({ isDashed }: CustomLegendSwatchProps) => (
  <svg width="24" height="8" aria-hidden className={isDashed ? 'text-muted-foreground' : 'text-primary'}>
    <line x1="0" y1="4" x2="24" y2="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray={isDashed ? '6 5' : undefined} />
  </svg>
);

export default CustomLegendSwatch;
