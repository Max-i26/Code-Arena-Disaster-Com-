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
  private circuitOpenUntil = 0;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || '';
  }

  public async generateCompletion(options: NvidiaChatOptions): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    // Circuit breaker: if recent calls timed out or failed, skip immediately (0ms delay)
    if (Date.now() < this.circuitOpenUntil) {
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

      // Ultra-fast timeout: 500ms maximum to keep all submissions instant
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

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
        // Open circuit breaker for 60 seconds on HTTP error
        this.circuitOpenUntil = Date.now() + 60000;
        return null;
      }

      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      // Open circuit breaker for 60 seconds on network / timeout failure
      this.circuitOpenUntil = Date.now() + 60000;
      return null;
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('nvapi-') && Date.now() >= this.circuitOpenUntil);
  }
}

export const nvidiaAi = new NvidiaAiService();
