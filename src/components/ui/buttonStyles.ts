// src/components/ui/buttonStyles.ts
// Button look shared by <Button> and <ButtonLink> (01-color §5.5, 04-layout §5, 06-style §5.1)

export type ButtonVariant = 'accent' | 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

// Height, type and padding ladder (04-layout §5)
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-3 text-sm font-medium gap-2',
  md: 'h-control-md px-4 text-label font-medium gap-2',
  lg: 'h-control-lg px-4 text-label font-medium gap-2',
  xl: 'h-control-xl px-6 text-h4 font-semibold gap-2',
};

const variantClasses: Record<ButtonVariant, string> = {
  accent: 'bg-btn-accent text-btn-accent-fg hover:bg-btn-accent-hover active:bg-btn-accent-pressed',
  primary: 'bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-pressed',
  brand: 'bg-btn-brand text-btn-brand-fg hover:bg-btn-brand-hover active:bg-btn-brand-pressed',
  secondary: 'bg-transparent border border-line-strong text-fg hover:bg-state-hover active:bg-state-pressed',
  ghost: 'bg-transparent text-fg hover:bg-state-hover active:bg-state-pressed',
  danger: 'bg-btn-danger text-btn-danger-fg hover:bg-btn-danger-hover active:bg-btn-danger-pressed',
};

// Filled variants swap to the disabled tokens; outline/ghost only dim their label
const disabledClasses: Record<ButtonVariant, string> = {
  accent: 'inactive:bg-btn-disabled inactive:text-btn-disabled-fg',
  primary: 'inactive:bg-btn-disabled inactive:text-btn-disabled-fg',
  brand: 'inactive:bg-btn-disabled inactive:text-btn-disabled-fg',
  danger: 'inactive:bg-btn-disabled inactive:text-btn-disabled-fg',
  secondary: 'inactive:text-fg-disabled inactive:border-line-subtle inactive:bg-transparent',
  ghost: 'inactive:text-fg-disabled inactive:bg-transparent',
};

export const buttonClasses = (variant: ButtonVariant, size: ButtonSize, fullWidth = false) =>
  `inline-flex items-center justify-center rounded-sm select-none whitespace-nowrap outline-none transition-control dur-2 ease-standard active:scale-98 focus-visible:ring-3 focus-visible:ring-line-focus/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas inactive:cursor-not-allowed inactive:active:scale-100 ${
    fullWidth ? 'w-full' : ''
  } ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses[variant]}`;
