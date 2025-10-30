export interface SitemapFile {
  name: string;
  addedDate: string;
  urls: string[];
}

export interface ArticleConfig {
  topic: string;
  generateImages: boolean;
  internalLinks?: string;
}

export enum GenerationStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export interface GenerationState {
  status: GenerationStatus;
  article: string | null;
  error: string | null;
}
