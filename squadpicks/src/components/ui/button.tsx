'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const VARIANT = {
  primary:   'bg-brand text-white hover:bg-brand-dark disabled:opacity-40',
  secondary: 'border border-slate-600 text-slate-200 hover:border-accent bg-transparent',
  ghost:     'text-slate-300 hover:text-white hover:bg-slate-800 bg-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700',
}
const SIZE = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-7 py-3 text-base rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  )
)
Button.displayName = 'Button'
