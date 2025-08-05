import { Metadata } from 'next';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline | Growth Compass',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center px-4 py-12 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
          <WifiOff className="h-10 w-10 text-gray-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        
        <p className="text-gray-600 mb-8">
          It looks like you've lost your internet connection. 
          Some features may be limited, but your work is saved locally 
          and will sync when you're back online.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-12 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
            What you can do offline:
          </p>
          <ul className="text-sm text-blue-700 text-left space-y-1">
            <li>• View cached student data</li>
            <li>• Record attendance (will sync later)</li>
            <li>• Access recent feedback</li>
            <li>• Review growth analytics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}