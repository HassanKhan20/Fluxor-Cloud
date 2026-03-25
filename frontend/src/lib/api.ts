export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function authHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

export const api = {
    get: async (endpoint: string, token?: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers: authHeaders(token),
        });
        return handleResponse(res);
    },
    post: async (endpoint: string, body: any, token?: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    put: async (endpoint: string, body: any, token?: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    patch: async (endpoint: string, body: any, token?: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    delete: async (endpoint: string, token?: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: authHeaders(token),
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
