import { apiClient } from './client';
import type { SnapshotItem, CreateItemRequest, UpdateItemRequest } from '../types/index';

export async function addItem(
  snapshotId: string,
  payload: CreateItemRequest
): Promise<{ item: SnapshotItem; hasDuplicateWarning: boolean }> {
  const { data } = await apiClient.post<{ item: SnapshotItem; hasDuplicateWarning: boolean }>(
    `/snapshots/${snapshotId}/items`,
    payload
  );
  return data;
}

export async function updateItem(
  snapshotId: string,
  itemId: string,
  payload: UpdateItemRequest
): Promise<{ item: SnapshotItem; hasDuplicateWarning: boolean }> {
  const { data } = await apiClient.put<{ item: SnapshotItem; hasDuplicateWarning: boolean }>(
    `/snapshots/${snapshotId}/items/${itemId}`,
    payload
  );
  return data;
}

export async function deleteItem(snapshotId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/snapshots/${snapshotId}/items/${itemId}`);
}

export async function reorderItems(
  snapshotId: string,
  orders: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  // Batch update display orders sequentially
  await Promise.all(
    orders.map(({ id, displayOrder }) =>
      apiClient.put(`/snapshots/${snapshotId}/items/${id}`, { displayOrder })
    )
  );
}
