import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as itemsApi from '../api/items';
import type { CreateItemRequest, UpdateItemRequest } from '../types/index';
import { snapshotKey } from './useSnapshots';

export function useAddItem(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItemRequest) => itemsApi.addItem(snapshotId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
    },
  });
}

export function useUpdateItem(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateItemRequest }) =>
      itemsApi.updateItem(snapshotId, itemId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
    },
  });
}

export function useDeleteItem(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemsApi.deleteItem(snapshotId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
    },
  });
}

export function useReorderItems(snapshotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: Array<{ id: string; displayOrder: number }>) =>
      itemsApi.reorderItems(snapshotId, orders),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snapshotKey(snapshotId) });
    },
  });
}
