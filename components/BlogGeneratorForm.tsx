import React, { useState, useEffect } from 'react';
import type { ArticleConfig, SitemapFile } from '../types';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Textarea } from './ui/Textarea';
import { CheckIcon } from './icons/CheckIcon';
// Fix: Import the Spinner component.
import { Spinner } from './ui/Spinner';

interface BlogGeneratorFormProps {
  onGenerate: (configs: ArticleConfig[]) => void;
  isLoading: boolean;
  apiKey: string;
  onSaveApiKey: (apiKey: string) => Promise<boolean>;
}

const SITEMAPS_STORAGE_KEY = 'userSitemaps';

export const BlogGeneratorForm: React.FC<BlogGeneratorFormProps> = ({ onGenerate, isLoading, apiKey, onSaveApiKey }) => {
  const [topic, setTopic] = useState('');
  const [generateImages, setGenerateImages] = useState(true);
  const [sitemaps, setSitemaps] = useState<SitemapFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentApiKey, setCurrentApiKey] = useState(apiKey);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setCurrentApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    try {
      const storedSitemaps = localStorage.getItem(SITEMAPS_STORAGE_KEY);
      if (storedSitemaps) {
        setSitemaps(JSON.parse(storedSitemaps));
      }
    } catch (e) {
      console.error("Failed to parse sitemaps from local storage", e);
      setSitemaps([]);
    }
  }, []);

  const handleApiKeySave = async () => {
    setApiKeyStatus('saving');
    const success = await onSaveApiKey(currentApiKey);
    if (success) {
        setApiKeyStatus('saved');
        setTimeout(() => setApiKeyStatus('idle'), 2000);
    } else {
        setApiKeyStatus('error');
        setTimeout(() => setApiKeyStatus('idle'), 3000);
    }
  };

  const updateSitemaps = (newSitemaps: SitemapFile[]) => {
    setSitemaps(newSitemaps);
    localStorage.setItem(SITEMAPS_STORAGE_KEY, JSON.stringify(newSitemaps));
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);

    const sitemapPromises = Array.from(files).map(file => {
      return new Promise<SitemapFile>((resolve, reject) => {
        if (sitemaps.some(s => s.name === file.name)) {
          reject(`Sitemap "${file.name}" already exists.`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const xmlString = e.target?.result as string;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
              reject(`'${file.name}' is not a valid XML file.`);
              return;
            }
            const urlNodes = xmlDoc.getElementsByTagName("loc");
            const urls = Array.from(urlNodes).map(node => node.textContent).filter(Boolean) as string[];
            if (urls.length === 0) {
              reject(`No URLs found in '${file.name}'.`);
              return;
            }
            resolve({
              name: file.name,
              addedDate: new Date().toLocaleDateString(),
              urls: urls,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : `Unknown error with '${file.name}'.`;
            reject(message);
          }
        };
        reader.onerror = () => {
          reject(`Failed to read '${file.name}'.`);
        };
        reader.readAsText(file);
      });
    });

    Promise.allSettled(sitemapPromises).then(results => {
      const successfulSitemaps = results
        .filter((r): r is PromiseFulfilledResult<SitemapFile> => r.status === 'fulfilled')
        .map(r => r.value);
      
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);

      if (successfulSitemaps.length > 0) {
        updateSitemaps([...sitemaps, ...successfulSitemaps]);
      }
      if (errors.length > 0) {
        setError(errors.join('. '));
      }
    }).finally(() => {
        event.target.value = '';
    });
  };

  const handleDeleteSitemap = (sitemapName: string) => {
    const newSitemaps = sitemaps.filter(s => s.name !== sitemapName);
    updateSitemaps(newSitemaps);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const topics = topic.trim().split('\n').map(t => t.trim()).filter(Boolean);
    if (topics.length > 0) {
      const allInternalLinks = sitemaps.flatMap(s => s.urls).join('\n');
      const configs: ArticleConfig[] = topics.map(t => ({
        topic: t,
        generateImages,
        internalLinks: allInternalLinks,
      }));
      onGenerate(configs);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Article Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">API Settings</h3>
          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="api-key"
                type="password"
                value={currentApiKey}
                onChange={(e) => {
                    setCurrentApiKey(e.target.value);
                    setApiKeyStatus('idle');
                }}
                placeholder="Enter your Gemini API Key"
                disabled={isLoading || apiKeyStatus === 'saving'}
              />
              <Button
                type="button"
                onClick={handleApiKeySave}
                disabled={isLoading || apiKeyStatus === 'saving' || apiKey === currentApiKey}
                variant="outline"
                className="w-24"
              >
                {apiKeyStatus === 'saving' ? <Spinner className="w-4 h-4 mx-auto"/> :
                 apiKeyStatus === 'saved' ? <span className="flex items-center"><CheckIcon className="w-4 h-4 mr-2 text-green-500"/>Saved</span> :
                 apiKeyStatus === 'error' ? 'Error!' :
                 'Save Key'}
              </Button>
            </div>
            {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">An API key is required to generate articles.</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Blog Post Topics (one per line)</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The Art of Mindful Communication\nHow to Build a Daily Reading Habit\nBenefits of Journaling for Mental Clarity"
              required
              disabled={isLoading}
              rows={5}
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="sitemap-upload">Manage Internal Links</Label>
            <Input
                id="sitemap-upload"
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                disabled={isLoading}
                multiple
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
             <p className="text-xs text-gray-500 dark:text-gray-400">Upload one or more XML sitemaps to provide the AI with your site's URLs.</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            
            {sitemaps.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Stored Sitemaps:</h4>
                    <ul className="max-h-32 overflow-y-auto space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        {sitemaps.map(sitemap => (
                            <li key={sitemap.name} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                <div className="truncate">
                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate" title={sitemap.name}>{sitemap.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Added: {sitemap.addedDate}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteSitemap(sitemap.name)}
                                    disabled={isLoading}
                                    aria-label={`Remove ${sitemap.name}`}
                                    className="ml-2 px-2 py-1 flex-shrink-0"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
          
          <div className="flex items-center pt-2">
            <input
              id="generate-images"
              name="generate-images"
              type="checkbox"
              checked={generateImages}
              onChange={(e) => setGenerateImages(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-700"
            />
            <label htmlFor="generate-images" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Generate a featured image
            </label>
          </div>
          <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full">
            {isLoading ? (
              'Generating...'
            ) : (
              <>
                <MagicWandIcon className="w-4 h-4 mr-2" />
                Generate Article
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};