// This global declaration helps TypeScript understand the object injected by WordPress.
declare global {
    interface Window {
      aiBlogGenerator: {
        apiKey: string;
        restUrl: string;
        nonce: string;
      };
    }
  }

interface PublishPayload {
    title: string;
    content: string;
    imageBase64: string | null;
}

interface PublishResponse {
    success: boolean;
    message: string;
    post_id: number;
    edit_link: string;
    view_link: string;
}
  
export async function saveApiKey(apiKey: string): Promise<{success: boolean}> {
    const response = await fetch(`${window.aiBlogGenerator.restUrl}ai-blog-generator/v1/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.aiBlogGenerator.nonce,
        },
        body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save API key.' }));
        throw new Error(errorData.message || 'Failed to save API key.');
    }

    return response.json();
}

export async function publishPost(payload: PublishPayload): Promise<PublishResponse> {
    const response = await fetch(`${window.aiBlogGenerator.restUrl}ai-blog-generator/v1/publish`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.aiBlogGenerator.nonce,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred while publishing.' }));
        throw new Error(errorData.message || 'Failed to publish post.');
    }

    return response.json();
}