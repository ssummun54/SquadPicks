'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...rest }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full px-4 py-2.5 rounded-lg bg-slate-900 border ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-accent'
        } text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 transition-colors ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'
