// src/components/ui/Button.tsx
// Core Interactive Button per UI Kit 01-color-system.md §5.5 & 06-visual-style-fintech.md §5.1
// Colors come from theme-aware tokens, so no JS theme branching is needed.

import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { buttonClasses, ButtonVariant, ButtonSize } from './buttonStyles';
import { LoadingSquares } from './LoadingSquares';

export type { ButtonVariant, ButtonSize };

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'lg',
      loading = false,
      icon,
      iconPosition = 'start',
      fullWidth = false,
      children,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // While loading the label stays so the width never changes (06-style §5.1)
    const leading =
      loading && iconPosition === 'start' ? <LoadingSquares /> : icon && iconPosition === 'start' ? icon : null;
    const trailing =
      loading && iconPosition === 'end' ? <LoadingSquares /> : icon && iconPosition === 'end' ? icon : null;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${buttonClasses(variant, size, fullWidth)} ${className}`}
        {...props}
      >
        {leading && <span className="inline-flex shrink-0">{leading}</span>}
        <span>{children}</span>
        {trailing && <span className="inline-flex shrink-0">{trailing}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Navigation that looks like a button: a real link, never a button nested in a link
interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const ButtonLink: React.FC<ButtonLinkProps> = ({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => (
  <Link className={`${buttonClasses(variant, size, fullWidth)} ${className}`} {...props}>
    {children}
  </Link>
);
