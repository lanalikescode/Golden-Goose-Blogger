import React, { useState, useCallback, useEffect } from 'react';
import { BlogGeneratorForm } from './components/BlogGeneratorForm';
import { BlogPostDisplay } from './components/BlogPostDisplay';
import { generateBlogPost } from './services/geminiService';
import { publishPost, saveApiKey } from './services/wordpressService';
import type { ArticleConfig, GenerationState } from './types';
import { GenerationStatus } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Add a global declaration for the object WordPress will create
declare global {
  interface Window {
    aiBlogGenerator: {
      apiKey: string;
      restUrl: string;
      nonce: string;
    };
  }
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: GenerationStatus.IDLE,
    article: null,
    error: null,
  });
  const [publishState, setPublishState] = useState<{ status: 'idle' | 'publishing' | 'success' | 'error', message: string | null }>({ status: 'idle', message: null });
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load the initial API key from the localized script data
    setApiKey(window.aiBlogGenerator?.apiKey || '');
  }, []);

  const handleGenerate = useCallback(async (configs: ArticleConfig[]) => {
    if (!apiKey) {
      setGenerationState({ status: GenerationStatus.ERROR, article: null, error: 'API Key is not configured. Please add your key in the API Settings section.' });
      return;
    }
    setPublishState({ status: 'idle', message: null });
    setGenerationState({ status: GenerationStatus.LOADING, article: null, error: null });
    let lastGeneratedArticle: string | null = null;
    let hasError = false;

    try {
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        const progressPrefix = configs.length > 1 ? `(${i + 1}/${configs.length}) ` : '';
        
        const onProgress = (message: string) => {
            setProgressMessage(`${progressPrefix}${message}`);
        };

        setProgressMessage(`${progressPrefix}Generating article for "${config.topic}"...`);

        const articleMarkdown = await generateBlogPost(apiKey, config, onProgress);
        lastGeneratedArticle = articleMarkdown;

        setGenerationState({ status: GenerationStatus.SUCCESS, article: lastGeneratedArticle, error: null });
      }
    } catch (error) {
      hasError = true;
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setGenerationState({ status: GenerationStatus.ERROR, article: null, error: errorMessage });
    } finally {
      if (configs.length > 1 && !hasError) {
        setProgressMessage(`Completed generation of ${configs.length} articles.`);
        setTimeout(() => setProgressMessage(null), 4000);
      } else if (!hasError) {
        setProgressMessage(null);
      }
    }
  }, [apiKey]);

  const handleSaveApiKey = async (newApiKey: string): Promise<boolean> => {
    try {
      await saveApiKey(newApiKey);
      setApiKey(newApiKey);
      return true;
    } catch (error) {
      console.error("Failed to save API key", error);
      return false;
    }
  };

  const handlePublish = useCallback(async (articleHtml: string, articleMarkdown: string) => {
    setPublishState({ status: 'publishing', message: 'Publishing post...' });

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = articleHtml;
    const title = tempDiv.querySelector('h1')?.textContent || 'Untitled Post';

    const imageMatch = articleMarkdown.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
    const imageBase64 = imageMatch ? imageMatch[1] : null;

    let contentToPublish = articleHtml;
    const imgTag = tempDiv.querySelector('img');
    if (imgTag) {
        contentToPublish = contentToPublish.replace(imgTag.outerHTML, '');
    }
    
    try {
      const response = await publishPost({ title, content: contentToPublish, imageBase64 });
      setPublishState({ status: 'success', message: `Post published successfully! <a href="${response.edit_link}" target="_blank" class="font-semibold underline hover:text-green-900 dark:hover:text-green-200">Edit Draft</a> or <a href="${response.view_link}" target="_blank" class="font-semibold underline hover:text-green-900 dark:hover:text-green-200">Preview Post</a>` });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during publishing.';
        setPublishState({ status: 'error', message: `Failed to publish: ${errorMessage}` });
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <BlogGeneratorForm
              onGenerate={handleGenerate}
              isLoading={generationState.status === GenerationStatus.LOADING}
              apiKey={apiKey}
              onSaveApiKey={handleSaveApiKey}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <BlogPostDisplay
              state={generationState}
              progressMessage={progressMessage}
              onPublish={handlePublish}
              publishState={publishState}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
