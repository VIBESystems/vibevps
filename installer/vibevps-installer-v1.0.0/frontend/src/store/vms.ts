import { create } from 'zustand';
import { api } from '../api/client';

interface VMState {
  vms: any[];
  loading: boolean;
  error: string | null;
  fetchVMs: () => Promise<void>;
  vmAction: (hypervisorId: number, vmId: string, action: string) => Promise<void>;
  updateVMsForHypervisor: (hypervisorId: number, vms: any[]) => void;
}

function sortVMs(vms: any[]) {
  return [...vms].sort((a, b) => {
    // Sort by name, stable
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return String(a.vmid).localeCompare(String(b.vmid));
  });
}

export const useVMs = create<VMState>((set, get) => ({
  vms: [],
  loading: false,
  error: null,

  fetchVMs: async () => {
    set({ loading: true, error: null });
    try {
      const vms = await api.getVMs();
      set({ vms: sortVMs(vms), loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  vmAction: async (hypervisorId, vmId, action) => {
    await api.vmAction(hypervisorId, vmId, action);
    // Refresh after action
    setTimeout(() => get().fetchVMs(), 1500);
  },

  updateVMsForHypervisor: (hypervisorId, newVMs) => {
    const current = get().vms;
    // Replace only VMs belonging to this hypervisor, keep others
    const otherVMs = current.filter((vm) => vm.hypervisorId !== hypervisorId);
    set({ vms: sortVMs([...otherVMs, ...newVMs]) });
  },
}));
