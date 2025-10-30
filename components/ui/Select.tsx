
import React from 'react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => {
  const baseClasses = 'block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed';

  return (
    <select
      className={`${baseClasses} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};
