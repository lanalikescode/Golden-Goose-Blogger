
import React from 'react';

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', children, ...props }) => {
  const baseClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
  
  return (
    <label
      className={`${baseClasses} ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};
