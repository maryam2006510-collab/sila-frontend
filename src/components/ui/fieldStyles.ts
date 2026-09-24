// src/components/ui/fieldStyles.ts
// Border/ring states shared by Input and MoneyInput (01-color §5.4)

export const fieldStateClasses = (error?: string) =>
  error
    ? 'border-line-danger focus:ring-3 focus:ring-line-danger/35'
    : 'border-line-input hover:border-line-input-hover focus:border-line-focus focus:ring-3 focus:ring-line-focus/35';
