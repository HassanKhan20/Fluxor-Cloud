import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'dark' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = `
    inline-flex items-center justify-center gap-2 font-semibold rounded-xl
    transition-all duration-200 ease-out cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

    const variants = {
        primary: `
      bg-[#005CFF] text-white
      hover:bg-[#0047CC] hover:-translate-y-0.5
      shadow-[0_4px_14px_0_rgba(0,92,255,0.39)]
      hover:shadow-[0_6px_20px_0_rgba(0,92,255,0.45)]
      focus:ring-[#005CFF]
    `,
        secondary: `
      bg-transparent text-gray-900 border-2 border-gray-200
      hover:border-[#005CFF] hover:text-[#005CFF] hover:bg-blue-50
      focus:ring-[#005CFF]
    `,
        dark: `
      bg-[#0B0B0B] text-white
      hover:bg-[#1A1A1A] hover:-translate-y-0.5
      focus:ring-gray-800
    `,
        ghost: `
      bg-transparent text-gray-600
      hover:text-[#005CFF] hover:bg-gray-50
      focus:ring-[#005CFF]
    `,
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : (
                <>
                    {leftIcon}
                    {children}
                    {rightIcon}
                </>
            )}
        </button>
    );
};

export default Button;
