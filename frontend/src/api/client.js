const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function apiFetch(endpoint, options = {}) {
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  // If body is FormData, delete Content-Type to allow browser to set boundary
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err && err.detail) {
        errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } else if (err && err.message) {
        errorMsg = err.message;
      }
    } catch {
      // ignore json parse error
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    throw error;
  }

  // Check if response has content before parsing json
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const apiClient = {
  // --- AUTHENTICATION ---
  async signup(payload) {
    return apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async logout() {
    return apiFetch('/auth/logout', {
      method: 'POST'
    });
  },

  async forgotPassword(payload) {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async resetPassword(payload) {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMe() {
    return apiFetch('/auth/me');
  },

  // --- USER PROFILE & EXPERIMENT HISTORY ---
  async getUserExperiments({ status, category, search, from_date, to_date } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (category && category !== 'all') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    if (from_date) params.append('from_date', from_date);
    if (to_date) params.append('to_date', to_date);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/users/me/experiments${query}`);
  },

  async renameExperiment(experimentId, title) {
    return apiFetch(`/experiments/${experimentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    });
  },

  async deleteExperiment(experimentId) {
    return apiFetch(`/experiments/${experimentId}`, {
      method: 'DELETE'
    });
  },

  // --- EXPERIMENT CORE ---
  async getHealth() {
    return apiFetch('/health');
  },

  async getModels() {
    return apiFetch('/models');
  },

  async getExperiments() {
    return apiFetch('/experiments');
  },

  async createExperiment(payload) {
    return apiFetch('/experiments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getExperimentStatus(experimentId) {
    return apiFetch(`/experiments/${experimentId}`);
  },

  async getExperimentResults(experimentId) {
    return apiFetch(`/experiments/${experimentId}/results`);
  },

  async getLineage(experimentId) {
    return apiFetch(`/experiments/${experimentId}/lineage`);
  },

  async getGenerations(experimentId) {
    return apiFetch(`/experiments/${experimentId}/generations`);
  },

  async getDefense(experimentId) {
    return apiFetch(`/experiments/${experimentId}/defense`);
  },

  async triggerDefense(experimentId, modelId) {
    return apiFetch(`/experiments/${experimentId}/defense`, {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    });
  },

  getExportUrl(experimentId) {
    return `${API_BASE}/experiments/${experimentId}/export`;
  },

  async uploadZip(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/experiments/upload', {
      method: 'POST',
      body: formData
    });
  },

  // --- PHASE 3: MUTATOR WORKBENCH ---
  async workbenchMutate({ prompt_text, technique, category, model_id }) {
    return apiFetch('/workbench/mutate', {
      method: 'POST',
      body: JSON.stringify({ prompt_text, technique, category, model_id })
    });
  },

  async workbenchCrossover({ parent_prompt_a, parent_prompt_b, category, model_id }) {
    return apiFetch('/workbench/crossover', {
      method: 'POST',
      body: JSON.stringify({ parent_prompt_a, parent_prompt_b, category, model_id })
    });
  },

  async workbenchIsolateTest({ prompt_text, category, technique_used, model_id }) {
    return apiFetch('/workbench/isolate-test', {
      method: 'POST',
      body: JSON.stringify({ prompt_text, category, technique_used, model_id })
    });
  },

  // --- PHASE 4: MULTI-MODEL BATTLE ARENA ---
  async runBattleArena({ prompts, model_ids, category }) {
    return apiFetch('/arena/run', {
      method: 'POST',
      body: JSON.stringify({ prompts, model_ids, category })
    });
  },

  // --- PHASE 5: EXECUTIVE SAFETY AUDIT REPORT ---
  async getSafetyReport(experimentId) {
    return apiFetch(`/experiments/${experimentId}/report`);
  },

  getSafetyReportHtmlUrl(experimentId) {
    return `${API_BASE}/experiments/${experimentId}/report/html`;
  },

  getReportHtmlUrl(experimentId) {
    return `${API_BASE}/experiments/${experimentId}/report/html`;
  }
};
