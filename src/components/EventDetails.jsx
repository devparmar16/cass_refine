import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function EventDetails({ event }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">{event?.event_name}</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {event?.event_date ? format(new Date(event.event_date), 'MMMM dd, yyyy') : 'Date not set'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPinIcon className="h-4 w-4" />
            {event?.location || 'Location not set'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <UsersIcon className="h-4 w-4" />
            {event?.attendees || 0} Attendees
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{event?.event_desc}</p>
      </CardContent>
    </Card>
  );
} 