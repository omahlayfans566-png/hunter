import https from 'https';

export interface HttpFetchOptions {
    headers?: Record<string, string>;
    timeoutMs?: number;
}

const DEFAULT_UA = 'AI-Job-Hunter/1.0 (personal developer job tracker)';

/** Minimal JSON GET helper over node https with timeout + UA + error mapping. */
export function httpFetchJson(url: string, options: HttpFetchOptions = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            {
                headers: {
                    'User-Agent': DEFAULT_UA,
                    Accept: 'application/json',
                    ...options.headers,
                },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            },
        );
        req.on('error', reject);
        req.setTimeout(options.timeoutMs ?? 20000, () => req.destroy(new Error('Request timeout')));
    });
}