'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Bell, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export function QuickActions() {
  const pendingActions = [
    {
      id: 'review-flags',
      title: 'Review Flags',
      count: 3,
      description: 'Students need attention',
      icon: AlertTriangle,
      color: 'text-red-600',
      urgency: 'high'
    },
    {
      id: 'missing-profiles',
      title: 'Missing Profiles',
      count: 2,
      description: 'Complete student profiles',
      icon: Users,
      color: 'text-yellow-600',
      urgency: 'medium'
    },
    {
      id: 'pending-reviews',
      title: 'Pending Reviews',
      count: 5,
      description: 'Daily logs to review',
      icon: CheckCircle,
      color: 'text-blue-600',
      urgency: 'low'
    }
  ];

  return (
    <Card className="bg-white border-gray-100 shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pending Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Pending Actions</h4>
          <div className="space-y-2">
            {pendingActions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${action.color}`} />
                    <div>
                      <div className="font-medium text-slate-900">{action.title}</div>
                      <div className="text-xs text-slate-500">{action.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${
                    action.urgency === 'high' ? 'border-red-200 text-red-800' :
                    action.urgency === 'medium' ? 'border-yellow-200 text-yellow-800' :
                    'border-blue-200 text-blue-800'
                  }`}>
                    {action.count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}