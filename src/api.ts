const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://ids-autoencoder-backend.onrender.com').replace(/\/$/, '');
const API_URL = `${BASE_URL}/api/v1`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 30000, retries = 0) => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      lastError = err;
      if (attempt < retries) await sleep(1500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
};

const parseError = async (res: Response, fallback: string) => {
  try {
    const body = await res.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
};

export const checkHealth = async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/health`, {}, 90000, 1);
  if (!res.ok) throw new Error(`Backend health check failed (${res.status})`);
  const data = await res.json();
  if (data.status !== 'healthy') throw new Error('Backend unhealthy');
  return data;
};

export const checkModelStatus = async () => {
  const res = await fetchWithTimeout(`${API_URL}/model/status`, {}, 90000, 1);
  if (!res.ok) throw new Error(`Model status request failed (${res.status})`);
  return await res.json();
};

export const getAlerts = async (params: { q?: string; severity?: string; status?: string; protocol?: string; limit?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.severity && params.severity !== 'All') search.set('severity', params.severity);
  if (params.status && params.status !== 'All') search.set('status', params.status);
  if (params.protocol && params.protocol !== 'All') search.set('protocol', params.protocol);
  search.set('limit', String(params.limit ?? 100));
  const res = await fetchWithTimeout(`${API_URL}/alerts?${search.toString()}`, {}, 60000, 1);
  if (!res.ok) throw new Error(await parseError(res, `Alert request failed (${res.status})`));
  return await res.json();
};

export const getMetrics = async () => {
  const res = await fetchWithTimeout(`${API_URL}/metrics`, {}, 60000, 1);
  if (!res.ok) throw new Error(await parseError(res, `Metrics request failed (${res.status})`));
  return await res.json();
};

export const getReportSummary = async () => {
  const res = await fetchWithTimeout(`${API_URL}/reports/summary`, {}, 60000, 1);
  if (!res.ok) throw new Error(await parseError(res, `Report summary request failed (${res.status})`));
  return await res.json();
};

export const trainModel = async (percentile = 95.0) => {
  const res = await fetchWithTimeout(`${API_URL}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_path: 'data/nsl_kdd_subset.csv', normal_label: 'normal', percentile })
  }, 15 * 60 * 1000, 0);
  if (!res.ok) throw new Error(await parseError(res, 'Training failed'));
  return await res.json();
};

export const predictSample = async (features: Record<string, any>, metadata: { source_ip?: string; destination_ip?: string; protocol?: string } = {}) => {
  const res = await fetchWithTimeout(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features, ...metadata })
  }, 60000, 1);
  if (!res.ok) throw new Error(await parseError(res, 'Prediction failed'));
  return await res.json();
};

export const predictCSV = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetchWithTimeout(`${API_URL}/predict/csv`, { method: 'POST', body: formData }, 120000, 0);
  if (!res.ok) throw new Error(await parseError(res, 'CSV Prediction failed'));
  return await res.json();
};

export const getApiBaseUrl = () => BASE_URL;
