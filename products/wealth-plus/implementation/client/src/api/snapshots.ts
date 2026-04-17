import { apiClient } from './client';
import type {
  Snapshot,
  SnapshotWithComparison,
  CreateSnapshotRequest,
  ImportSnapshotRequest,
  UpdateSnapshotRequest,
} from '../types/index';

export async function listSnapshots(): Promise<Snapshot[]> {
  const { data } = await apiClient.get<{ snapshots: Snapshot[] }>('/snapshots');
  return data.snapshots;
}

export async function getSnapshot(id: string): Promise<SnapshotWithComparison> {
  const { data } = await apiClient.get<SnapshotWithComparison>(`/snapshots/${id}`);
  return data;
}

export async function createSnapshot(payload: CreateSnapshotRequest): Promise<SnapshotWithComparison> {
  const { data } = await apiClient.post<{ snapshot: SnapshotWithComparison['snapshot'] & { items: SnapshotWithComparison['items'] } }>('/snapshots', payload);
  return {
    snapshot: data.snapshot,
    items: data.snapshot.items ?? [],
    closedItems: [],
    priorSnapshotId: null,
    priorSnapshotDate: null,
  };
}

export async function updateSnapshot(id: string, payload: UpdateSnapshotRequest): Promise<SnapshotWithComparison['snapshot']> {
  const { data } = await apiClient.put<{ snapshot: SnapshotWithComparison['snapshot'] }>(`/snapshots/${id}`, payload);
  return data.snapshot;
}

export async function deleteSnapshot(id: string): Promise<void> {
  await apiClient.delete(`/snapshots/${id}`);
}

export async function duplicateSnapshot(
  id: string,
  payload: CreateSnapshotRequest
): Promise<{ snapshot: SnapshotWithComparison['snapshot']; items: SnapshotWithComparison['items']; sourceSnapshotId: string }> {
  const { data } = await apiClient.post<{
    snapshot: SnapshotWithComparison['snapshot'];
    items: SnapshotWithComparison['items'];
    sourceSnapshotId: string;
  }>(`/snapshots/${id}/duplicate`, payload);
  return data;
}

export async function lockSnapshot(id: string): Promise<SnapshotWithComparison['snapshot']> {
  const { data } = await apiClient.post<{ snapshot: SnapshotWithComparison['snapshot'] }>(`/snapshots/${id}/lock`);
  return data.snapshot;
}

export async function unlockSnapshot(id: string): Promise<SnapshotWithComparison['snapshot']> {
  const { data } = await apiClient.post<{ snapshot: SnapshotWithComparison['snapshot'] }>(`/snapshots/${id}/unlock`);
  return data.snapshot;
}

export async function exportSnapshot(id: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get(` /snapshots/${id}/export`.trim(), {
    responseType: 'blob',
  });

  const contentDisposition = response.headers['content-disposition'] as string | undefined;
  const fileNameMatch = contentDisposition?.match(/filename="([^"]+)"/);

  return {
    blob: response.data as Blob,
    fileName: fileNameMatch?.[1] ?? 'snapshot.csv',
  };
}

export async function importSnapshot(payload: ImportSnapshotRequest): Promise<SnapshotWithComparison> {
  const { data } = await apiClient.post<SnapshotWithComparison>('/snapshots/import', payload);
  return data;
}
