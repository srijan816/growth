'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database
} from 'lucide-react';
import { OfflineStorage } from '@/lib/offline-storage';
import { format } from 'date-fns';

interface OfflineIndicatorProps {
  showDetails?: boolean;
}

export default function OfflineIndicator({ showDetails = false }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  const offlineStorage = OfflineStorage.getInstance();

  useEffect(() => {
    // Initial status
    setIsOnline(offlineStorage.getConnectionStatus());
    updatePendingCount();
    setLastSync(offlineStorage.getLastSyncTime());

    // Listen for status changes
    const unsubscribe = offlineStorage.onStatusChange((status) => {
      setIsOnline(status);
      if (status) {
        handleAutoSync();
      }
    });

    // Update pending count periodically
    const interval = setInterval(() => {
      updatePendingCount();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = () => {
    setPendingCount(offlineStorage.getPendingSyncCount());
  };

  const handleAutoSync = async () => {
    if (offlineStorage.getPendingSyncCount() > 0) {
      await handleManualSync();
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncErrors([]);
    
    try {
      const result = await offlineStorage.syncAllData();
      
      if (result.success) {
        setLastSync(new Date());
        updatePendingCount();
      } else {
        setSyncErrors(result.errors);
      }
    } catch (error) {
      setSyncErrors([error instanceof Error ? error.message : 'Sync failed']);
    } finally {
      setSyncing(false);
    }
  };

  const clearSyncedData = () => {
    offlineStorage.clearSyncedData();
    updatePendingCount();
  };

  if (!showDetails) {
    // Compact indicator for header/nav
    return (
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            <Database className="h-3 w-3 mr-1" />
            {pendingCount} pending
          </Badge>
        )}
        
        {pendingCount > 0 && isOnline && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={syncing}
            className="h-6 px-2 text-xs"
          >
            {syncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              'Sync'
            )}
          </Button>
        )}
      </div>
    );
  }

  // Detailed view for settings/status page
  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Alert className={isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {' - '}
            {isOnline 
              ? 'All data will sync automatically' 
              : 'Data will be saved locally and synced when connection returns'
            }
          </AlertDescription>
        </div>
      </Alert>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Offline Data Status
          </CardTitle>
          <CardDescription>
            Local storage and synchronization status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Data */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Pending Sync</span>
            </div>
            <Badge variant={pendingCount > 0 ? 'destructive' : 'default'}>
              {pendingCount} items
            </Badge>
          </div>

          {/* Last Sync */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Last Sync</span>
            </div>
            <span className="text-sm text-gray-600">
              {lastSync ? format(lastSync, 'MMM d, h:mm a') : 'Never'}
            </span>
          </div>

          {/* Sync Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleManualSync}
              disabled={!isOnline || syncing || pendingCount === 0}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now ({pendingCount})
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={clearSyncedData}
              disabled={pendingCount === 0}
            >
              Clear Synced
            </Button>
          </div>

          {/* Sync Errors */}
          {syncErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Sync Errors:</div>
                <ul className="text-sm list-disc list-inside">
                  {syncErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Offline Features Info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Offline Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Take attendance without internet connection</li>
              <li>✓ Schedule makeup classes offline</li>
              <li>✓ Automatic sync when connection returns</li>
              <li>✓ Data persists across browser sessions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}