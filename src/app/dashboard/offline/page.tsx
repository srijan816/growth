import OfflineIndicator from '@/components/offline/OfflineIndicator';

export default function OfflinePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Offline Mode & Sync Status</h1>
        <p className="text-gray-600 mt-2">
          Manage offline data storage and synchronization settings
        </p>
      </div>
      
      <OfflineIndicator showDetails={true} />
    </div>
  );
}