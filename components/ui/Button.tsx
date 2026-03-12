'use client';

import { type HTMLMotionProps, motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: ButtonVariant;
  large?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50',
  secondary:
    'bg-secondary text-white shadow-lg shadow-secondary/30 hover:shadow-secondary/50',
  danger:
    'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50',
};

export function Button({
  variant = 'primary',
  large = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.95 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-2xl font-bold
        transition-shadow duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${large ? 'px-8 py-4 text-xl min-h-[56px]' : 'px-5 py-3 text-base min-h-[48px]'}
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
