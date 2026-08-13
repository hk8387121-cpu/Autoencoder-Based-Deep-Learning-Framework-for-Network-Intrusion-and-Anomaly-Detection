const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ids-autoencoder-backend.onrender.com';
const API_URL = `${BASE_URL}/api/v1`;

export const checkHealth = async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Backend not reachable');
    return await res.json();
  } catch (err) {
    throw err;
  }
};

export const checkModelStatus = async () => {
  try {
    const res = await fetch(`${API_URL}/model/status`);
    if (!res.ok) throw new Error('Backend not reachable');
    return await res.json();
  } catch (err) {
    throw err;
  }
};

export const trainModel = async (percentile = 95.0) => {
  const res = await fetch(`${API_URL}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_path: 'data/nsl_kdd_subset.csv',
      normal_label: 'normal',
      percentile: percentile
    })
  });
  if (!res.ok) throw new Error('Training failed');
  return await res.json();
};

export const predictSample = async (features: any) => {
  const res = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features })
  });
  if (!res.ok) throw new Error('Prediction failed');
  return await res.json();
};

export const predictCSV = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_URL}/predict/csv`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('CSV Prediction failed');
  return await res.json();
};
