import React, { useState, useEffect, useRef } from 'react';
import type { GenerationState } from '../types';
import { GenerationStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Spinner } from './ui/Spinner';
import { Button } from './ui/Button';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PublishIcon } from './icons/PublishIcon';

interface BlogPostDisplayProps {
  state: GenerationState;
  progressMessage: string | null;
  onPublish: (htmlContent: string, markdownContent: string) => void;
  publishState: { status: 'idle' | 'publishing' | 'success' | 'error', message: string | null };
}

declare global {
  interface Window {
    marked: {
      parse(markdownString: string): string;
    };
  }
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };
  
    return (
      <Button onClick={handleCopy} variant="outline" size="sm">
        {copied ? (
          <>
            <CheckIcon className="w-4 h-4 mr-2 text-green-500" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="w-4 h-4 mr-2" />
            Copy HTML
          </>
        )}
      </Button>
    );
  };

export const BlogPostDisplay: React.FC<BlogPostDisplayProps> = ({ state, progressMessage, onPublish, publishState }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (state.status === GenerationStatus.SUCCESS && state.article) {
        if (typeof window.marked !== 'undefined') {
            const parsedHtml = window.marked.parse(state.article);
            setHtmlContent(parsedHtml);
        } else {
            setHtmlContent(`<pre>${state.article}</pre>`);
        }
    }
  }, [state.status, state.article]);

  const renderPublishStatus = () => {
    if (publishState.status === 'idle') return null;

    const baseClasses = 'text-sm p-3 rounded-md mt-6 text-center';
    let specificClasses = '';
    let message = publishState.message;

    switch (publishState.status) {
        case 'publishing':
            specificClasses = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center';
            message = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Publishing...`;
            break;
        case 'success':
            specificClasses = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            break;
        case 'error':
            specificClasses = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            break;
    }

    return (
        <div className={`${baseClasses} ${specificClasses}`} dangerouslySetInnerHTML={{ __html: message || ''}} />
    );
  };

  const renderContent = () => {
    switch (state.status) {
      case GenerationStatus.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-96">
            <Spinner />
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{progressMessage || 'Generating your masterpiece...'}</p>
            <p className="text-sm text-gray-500">This might take a moment.</p>
          </div>
        );
      case GenerationStatus.ERROR:
        return (
          <div className="flex items-center justify-center h-96 text-center text-red-500">
            <div>
              <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong.</h3>
              <p className="text-red-400 bg-red-500/10 p-4 rounded-md">{state.error}</p>
            </div>
          </div>
        );
      case GenerationStatus.SUCCESS:
        return (
          <>
            <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                    onClick={() => onPublish(htmlContent, state.article!)}
                    size="sm"
                    disabled={publishState.status === 'publishing'}
                >
                    <PublishIcon className="w-4 h-4 mr-2" />
                    {publishState.status === 'publishing' ? 'Publishing...' : 'Publish to WordPress'}
                </Button>
                <CopyButton textToCopy={htmlContent} />
            </div>
            <div
              ref={contentRef}
              className="prose dark:prose-invert max-w-none 
                         [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4
                         [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3
                         [&>h3]:hidden
                         [&>p]:leading-relaxed [&>p]:mb-4
                         [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4
                         [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4
                         [&>li]:mb-2
                         [&>a]:text-blue-500 hover:[&>a]:underline
                         [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:dark:border-gray-600 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:dark:text-gray-400 [&>blockquote]:my-4
                         [&>iframe]:my-6 [&>iframe]:rounded-xl [&>iframe]:shadow-sm
                         "
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            {renderPublishStatus()}
          </>
        );
      case GenerationStatus.IDLE:
      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Your Generated Article Will Appear Here</h3>
            <p className="mt-2 text-gray-500">Configure your API key, fill out the form, and click "Generate Article" to start.</p>
          </div>
        );
    }
  };

  return (
    <Card className="min-h-[60vh] relative">
      <CardHeader>
        <CardTitle>Generated Article</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};
