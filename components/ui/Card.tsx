
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return <div className={`p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
};

export const CardTitle: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h2>;
};

export const CardContent: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
};
