import dotenv from 'dotenv';
dotenv.config();

export interface NvidiaChatOptions {
  systemPrompt?: string;
  userPrompt: string;
  imageUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class NvidiaAiService {
  private apiKey: string;
  private endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
  private primaryModel = 'deepseek-ai/deepseek-v4-flash-0731';
  private visionModel = 'meta/llama-3.2-11b-vision-instruct';

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || '';
  }

  public async generateCompletion(options: NvidiaChatOptions): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      if (options.imageUrl) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: options.userPrompt },
            { type: 'image_url', image_url: { url: options.imageUrl } },
          ],
        });
      } else {
        messages.push({ role: 'user', content: options.userPrompt });
      }

      const modelToUse = options.model || (options.imageUrl ? this.visionModel : this.primaryModel);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 300,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Try fallback to primary model if vision endpoint model varies
        if (options.imageUrl && modelToUse !== this.primaryModel) {
          return this.generateCompletion({ ...options, model: this.primaryModel });
        }
        return null;
      }

      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      // Fallback cleanly on network or API failure
      return null;
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('nvapi-'));
  }
}

export const nvidiaAi = new NvidiaAiService();
