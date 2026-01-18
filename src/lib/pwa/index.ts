/**
 * PWA Module Index
 * Re-exports all PWA utilities
 */

// Background Sync
export {
  syncQueue,
  isBackgroundSyncSupported,
  isPeriodicSyncSupported,
  resolveConflict,
  queueTaskCreate,
  queueTaskUpdate,
  queueTaskDelete,
  registerPeriodicSync,
  unregisterPeriodicSync,
  isOnline,
  onOnline,
  onOffline,
  useSyncQueue,
  SYNC_QUEUE_KEY,
  MAX_RETRIES,
  SYNC_TAG,
  PERIODIC_SYNC_TAG,
} from "./background-sync"

export type {
  SyncOperation,
  SyncItem,
  SyncResult,
  ConflictResolution,
  OfflineTask,
} from "./background-sync"

// Push Subscription
export {
  isPushSupported,
  isNotificationSupported,
  getPermissionState,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  refreshSubscription,
  shouldRefreshSubscription,
  sendSubscriptionToServer,
  removeSubscriptionFromServer,
  showLocalNotification,
  handleNotificationClick,
  saveSubscriptionLocally,
  getLocalSubscription,
  usePushNotifications,
  PUSH_SUBSCRIPTION_KEY,
  VAPID_PUBLIC_KEY,
} from "./push-subscription"

export type {
  PushPermissionState,
  PushSubscriptionData,
  PushNotificationPayload,
} from "./push-subscription"

// Service Worker Client
export {
  isServiceWorkerSupported,
  isServiceWorkerReady,
  sendToServiceWorker,
  saveOfflineTask as swSaveOfflineTask,
  getOfflineTasks as swGetOfflineTasks,
  clearAllCaches,
  skipWaiting,
  onSyncComplete,
  registerBackgroundSync,
  registerPeriodicSync as swRegisterPeriodicSync,
  useOfflineSync,
} from "./service-worker-client"

export type {
  OfflineTask as SWOfflineTask,
  SyncMessage,
  UseOfflineSyncReturn,
} from "./service-worker-client"
