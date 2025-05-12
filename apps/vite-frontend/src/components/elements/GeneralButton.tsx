interface GeneralButtonProps {
  onClick?: () => void;
  text?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const GeneralButton = ({ 
  onClick, 
  text = 'Button', 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button'
}: GeneralButtonProps) => {
  
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white border-transparent",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200",
    outline: "bg-transparent hover:bg-gray-50 text-gray-800 border-gray-300",
    danger: "bg-red-500 hover:bg-red-600 text-white border-transparent"
  };
  
  const sizeStyles = {
    sm: "py-1 px-3 text-xs sm:text-sm md:text-sm lg:text-base rounded",
    md: "py-2 px-4 text-sm sm:text-base md:text-base lg:text-lg rounded-md",
    lg: "py-2.5 px-5 sm:py-3 sm:px-6 md:py-3.5 md:px-7 lg:py-4 lg:px-8 text-base sm:text-lg md:text-xl lg:text-2xl rounded-lg"
  };
  
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : 'w-auto'}
        font-medium border
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        shadow-sm
        flex items-center justify-center
      `}
    >
      {text}
    </button>
  );
}

export default GeneralButton

