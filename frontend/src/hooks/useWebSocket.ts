import { useEffect, useRef, useCallback } from 'react';
import { useVMs } from '../store/vms';

type StorageListener = (hypervisorId: number, storages: any[]) => void;
type NodeStatusListener = (hypervisorId: number, nodeStatus: any) => void;
type NetworkListener = (hypervisorId: number, vms: any[]) => void;

const storageListeners = new Set<StorageListener>();
const nodeStatusListeners = new Set<NodeStatusListener>();
const networkListeners = new Set<NetworkListener>();

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const updateVMsForHypervisor = useVMs((s) => s.updateVMsForHypervisor);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update' && data.hypervisorId) {
            if (data.vms) {
              updateVMsForHypervisor(data.hypervisorId, data.vms);
              for (const listener of networkListeners) {
                listener(data.hypervisorId, data.vms);
              }
            }
            if (data.storages) {
              for (const listener of storageListeners) {
                listener(data.hypervisorId, data.storages);
              }
            }
            if (data.nodeStatus) {
              for (const listener of nodeStatusListeners) {
                listener(data.hypervisorId, data.nodeStatus);
              }
            }
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [updateVMsForHypervisor]);
}

function useListener<T extends (...args: any[]) => void>(set: Set<T>, callback: T) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const stableCallback = useCallback((...args: any[]) => {
    (cbRef.current as any)(...args);
  }, []) as unknown as T;

  useEffect(() => {
    set.add(stableCallback);
    return () => { set.delete(stableCallback); };
  }, [stableCallback, set]);
}

export function useStorageUpdates(callback: StorageListener) {
  useListener(storageListeners, callback);
}

export function useNodeStatusUpdates(callback: NodeStatusListener) {
  useListener(nodeStatusListeners, callback);
}

export function useNetworkUpdates(callback: NetworkListener) {
  useListener(networkListeners, callback);
}
