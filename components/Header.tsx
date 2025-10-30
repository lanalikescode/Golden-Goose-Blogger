
import React from 'react';
import { FeatherIcon } from './icons/FeatherIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <FeatherIcon className="w-8 h-8 text-indigo-500" />
        <h1 className="text-2xl font-bold ml-3 tracking-tight text-gray-900 dark:text-white">
          AI Blog Post Generator
        </h1>
        <span className="ml-3 bg-indigo-100 text-indigo-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-indigo-200 dark:text-indigo-900">
          for WordPress
        </span>
      </div>
    </header>
  );
};
