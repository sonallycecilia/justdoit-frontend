import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';

// IMPORTANTE: api.get/api.post (src/api/client.js) já devolvem o corpo JSON
// já parseado (não é axios) — não existe um envelope `{ data: ... }`. Ler
// `response.data` aqui sempre resultava em `undefined`.
export const closureService = {
  getClosurePreview: async () => {
    return api.get(endpoints.weeklyClosure.preview);
  },

  submitClosure: async (command) => {
    return api.post(endpoints.weeklyClosure.close, command);
  },

  getClosedCycles: async () => {
    return api.get(endpoints.weeklyClosure.history);
  },

  getCycleSnapshots: async (cycleId) => {
    return api.get(endpoints.weeklyClosure.snapshots(cycleId));
  }
};
