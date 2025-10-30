import { GoogleGenAI, Modality } from "@google/genai";
import type { ArticleConfig } from '../types';

function constructPrompt(config: ArticleConfig): string {
  const { topic, internalLinks } = config;

  const internalLinksInstruction = internalLinks && internalLinks.trim().length > 0
  ? `  - **Internal Links:** Include 1-2 contextual internal links. You MUST choose relevant links from the following list. Do not invent your own internal links.
    \`\`\`
    ${internalLinks.trim()}
    \`\`\``
  : `  - **Internal Links:** Include 1-2 contextual internal links. Use placeholders in the format \`[Internal Link: descriptive-slug-for-relevant-page]\`.`;


  return `
You are an expert content writer and blogger with deep emotional intelligence. Your goal is to craft an article that connects, educates, and inspires readers through clarity, honesty, and lived experience.

**PRIMARY GOAL:** Write a blog post on the topic: "${topic}".

**TONE & STYLE:**
- Modern, conversational, and reflective.
- Warm, kind, and authentic.
- Write like a person who has lived and learned, speaking to readers as equals.
- Use "I" statements, examples, and observations drawn from real human experience.
- NEVER use em dashes. Use commas or periods instead.
- Avoid filler, repetition, or robotic phrasing.
- Write short paragraphs with a natural, easy flow.
- The output must be only the clean, ready-to-publish blog post in valid Markdown format. Do not include any extra explanations before or after the article.

**RESEARCH & SOURCING (EEAT STANDARDS):**
- Before writing, perform research using your available tools to gather relevant, credible resources.
- Integrate these resources directly into the article:
  - **Expert Quote:** Include at least one quote from a credible authority or expert in the field.
  - **Outbound Link:** Include one link to a trusted external source (academic, research-based, or established publication).
${internalLinksInstruction}
  - **Relevant Video:** Suggest a search query for a relevant YouTube video that explains or enhances a key point. Place a placeholder in the article body where it fits best, using the format: \`[YOUTUBE_SEARCH_QUERY: your concise search query here]\`. If no video would be a strong fit, do not include this placeholder.
  - **Other Resources:** If you find relevant books or news articles, link to them contextually.
- **Trustworthiness:** All writing must be honest and accurate. Avoid exaggeration or unsupported claims.

**STRUCTURE:**
Follow this structure precisely:
1.  **Featured Image Placeholder:** Start the entire output with a placeholder for a featured image. The format is: \`[FEATURED_IMAGE_PROMPT: A simple, text-free, illustrative image representing the concept of: ${topic}]\`
2.  **Title:** A compelling title, maximum 67 characters.
3.  **Table of Contents:** A short, bulleted list providing an easy overview of the article's sections.
4.  **Introduction:** A short, emotionally connecting opening that hooks the reader.
5.  **Featured Snippet Answer:** Immediately following the intro, write a direct, concise paragraph (40-60 words) that clearly answers the main question or keyword phrase of the topic. DO NOT give this paragraph a heading.
6.  **Body with Subheadings:** Use logical, keyword-aware, and inviting H2 subheadings to structure the main content.
7.  **Final Thoughts:** A short reflection offering insight or closure.
8.  **Citations:** If you referenced scholarly or research-based sources, list them here under a "References" H2 heading, using APA styling. Do not use any other citation format.
9.  **Author Bio:** End the entire post with this exact line: "Written by Aslan Madaev, writer exploring the human side of growth and learning."

**SEO GUIDELINES:**
- The topic "${topic}" is the focus keyphrase.
- Include the keyphrase (or natural variations) in the title, introduction, the featured snippet answer, and at least one subheading.
- Optimize for featured snippets by directly answering "how," "what," or "why" questions related to the topic near the beginning of the article.

**DISCLAIMER:**
- If the topic is related to medical, psychological, or therapeutic subjects, include this exact disclaimer at the very bottom, after the author bio: "This article is for educational purposes only and is not intended as medical or professional advice."

Begin the article now.
  `;
}

async function generateImage(apiKey: string, prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error('No image data returned from API.');

    } catch (error) {
        console.error(`Error generating image for prompt "${prompt}":`, error);
        throw new Error(`Failed to generate image. The model may have refused the prompt.`);
    }
}

async function findMediaUrl(apiKey: string, platform: 'YouTube', query: string, onProgress: (message: string) => void): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey });
    onProgress(`Searching for a relevant ${platform} link...`);
    try {
      const prompt = `Using your search tool, find the single most relevant ${platform} URL for the following topic: '${query}'. Respond with ONLY the raw URL and absolutely no other text, explanation, or formatting.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          temperature: 0,
        },
      });

      const url = response.text.trim();
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (platform === 'YouTube' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
          return url;
        }
      }
      console.warn(`Gemini returned a non-URL for ${platform} search with query "${query}":`, url);
      return null;
    } catch (error) {
      console.error(`Error finding ${platform} URL for query "${query}":`, error);
      return null;
    }
}

export async function generateBlogPost(
    apiKey: string,
    config: ArticleConfig,
    onProgress: (message: string) => void
  ): Promise<string> {
    if (!apiKey) {
      throw new Error("API Key is not configured. Please add it in the settings.");
    }
    const ai = new GoogleGenAI({ apiKey });
    const prompt = constructPrompt(config);
  
    try {
      onProgress('Researching and writing article...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
      });
      
      let articleContent = response.text.trim();
      
      const imagePlaceholderMatch = articleContent.match(/^\[FEATURED_IMAGE_PROMPT:(.*?)\]\s*\n?/);
  
      if (imagePlaceholderMatch) {
          articleContent = articleContent.replace(imagePlaceholderMatch[0], '');

          if (config.generateImages) {
              const imagePrompt = imagePlaceholderMatch[1].trim();
              onProgress('Generating featured image...');
              try {
                const imageDataUrl = await generateImage(apiKey, imagePrompt);
                const markdownImage = `![${config.topic}](${imageDataUrl})\n\n`;
                articleContent = markdownImage + articleContent;
              } catch (e) {
                console.error(`Failed to generate featured image for prompt: "${imagePrompt}"`, e);
              }
          }
      }

      const youtubePlaceholderRegex = /\[YOUTUBE_SEARCH_QUERY:(.*?)\]\n?/g;
      let youtubeMatch;
      while ((youtubeMatch = youtubePlaceholderRegex.exec(articleContent)) !== null) {
          const placeholder = youtubeMatch[0];
          const query = config.topic;
          const videoUrl = await findMediaUrl(apiKey, 'YouTube', query, onProgress);

          if (videoUrl) {
              const videoIdMatch = videoUrl.match(/(?:v=|v%3D|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/);
              const videoId = videoIdMatch ? videoIdMatch[1] : null;

              if (videoId) {
                  const embedHtml = `<iframe 
  title="${config.topic}" 
  width="600" 
  height="338" 
  src="https://www.youtube-nocookie.com/embed/${videoId}" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
  referrerpolicy="strict-origin-when-cross-origin" 
  allowfullscreen
  style="width: 100%; aspect-ratio: 16 / 9; border: none; border-radius: 12px; margin: 1.5rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">
</iframe>`;
                  articleContent = articleContent.replace(placeholder, embedHtml);
              } else {
                  const errorMessage = `<!-- YouTube embed failed: Could not extract a valid video ID from the URL: ${videoUrl} -->`;
                  articleContent = articleContent.replace(placeholder, errorMessage);
              }
          } else {
              const errorMessage = `<!-- YouTube embed failed: No relevant video was found for the topic "${query}" -->`;
              articleContent = articleContent.replace(placeholder, errorMessage);
          }
      }
      
      onProgress('Finalizing article...');
      return articleContent;
  
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
          throw new Error("Your Gemini API Key is not valid. Please check it in the settings.");
      }
      throw new Error("Failed to generate blog post. The model may have refused the prompt or an API error occurred.");
    }
  }