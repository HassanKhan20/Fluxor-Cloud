export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
    get: async (endpoint: string, token?: string) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers,
        });
        return handleResponse(res);
    },
    post: async (endpoint: string, body: any, token?: string) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    }
};

async function handleResponse(res: Response) {
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        throw new Error(data.message || 'API Error');
    }
    return data;
}
