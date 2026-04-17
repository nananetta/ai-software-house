import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as snapshotsApi from '../api/snapshots';
import type { CreateSnapshotRequest, ImportSnapshotRequest, UpdateSnapshotRequest } from '../types/index';

export const SNAPSHOTS_KEY = ['snapshots'] as const;
export const snapshotKey = (id: string) => ['snapshots', id] as const;

export function useSnapshots() {
  return useQuery({
    queryKey: SNAPSHOTS_KEY,
    queryFn: snapshotsApi.listSnapshots,
  });
}

export function useSnapshot(id: string) {
  return useQuery({
    queryKey: snapshotKey(id),
    queryFn: () => snapshotsApi.getSnapshot(id),
    enabled: Boolean(id),
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: CreateSnapshotRequest) => snapshotsApi.createSnapshot(payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
      navigate(`/snapshots/${data.snapshot.id}`);
    },
  });
}

export function useDuplicateSnapshot() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateSnapshotRequest }) =>
      snapshotsApi.duplicateSnapshot(id, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
      navigate(`/snapshots/${data.snapshot.id}`);
    },
  });
}

export function useUpdateSnapshot(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSnapshotRequest) =>
      snapshotsApi.updateSnapshot(snapshotId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => snapshotsApi.deleteSnapshot(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
      navigate('/snapshots');
    },
  });
}

export function useLockSnapshot(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => snapshotsApi.lockSnapshot(snapshotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
    },
  });
}

export function useUnlockSnapshot(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => snapshotsApi.unlockSnapshot(snapshotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
    },
  });
}

export function useImportSnapshot() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: ImportSnapshotRequest) => snapshotsApi.importSnapshot(payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
      navigate(`/snapshots/${data.snapshot.id}`);
    },
  });
}
