import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'subtle' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', className = '', type = 'button', ...props }, ref,
) {
  const variants = {
    primary: 'bg-primary/20 text-primary-foreground border border-primary/40 hover:bg-primary/30',
    subtle: 'bg-muted/40 text-foreground border border-border/40 hover:bg-muted/60',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
  };
  return <button ref={ref} type={type} className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props} />;
});