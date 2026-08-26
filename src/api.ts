const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://ids-autoencoder-backend.onrender.com').replace(/\/$/, '');
const API_URL = `${BASE_URL}/api/v1`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
  retries = 0
) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store'
      });
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

// Render Free services can take about a minute to wake after inactivity.
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

export const trainModel = async (percentile = 95.0) => {
  const res = await fetchWithTimeout(
    `${API_URL}/train`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_path: 'data/nsl_kdd_subset.csv',
        normal_label: 'normal',
        percentile
      })
    },
    15 * 60 * 1000,
    0
  );
  if (!res.ok) {
    let detail = 'Training failed';
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return await res.json();
};

export const predictSample = async (features: Record<string, any>) => {
  const res = await fetchWithTimeout(
    `${API_URL}/predict`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    },
    60000,
    1
  );
  if (!res.ok) {
    let detail = 'Prediction failed';
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return await res.json();
};

export const predictCSV = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithTimeout(
    `${API_URL}/predict/csv`,
    { method: 'POST', body: formData },
    120000,
    0
  );
  if (!res.ok) {
    let detail = 'CSV Prediction failed';
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return await res.json();
};
