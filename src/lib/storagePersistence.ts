export interface StorageStatus {
  persisted: boolean | null
  quotaMb: number | null
  usageMb: number | null
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null

  return {
    persisted,
    quotaMb: estimate?.quota ? Math.round(estimate.quota / 1024 / 1024) : null,
    usageMb: estimate?.usage ? Math.round(estimate.usage / 1024 / 1024) : null
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  return navigator.storage?.persist ? navigator.storage.persist() : null
}
