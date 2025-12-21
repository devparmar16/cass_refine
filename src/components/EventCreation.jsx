import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const EventCreation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    eventType: 'Technical'
  });

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save event to database
      const result = await supabase
        .from('events')
        .insert({
          event_name: newEvent.title,
          event_desc: newEvent.description,
          event_date: new Date(newEvent.startDate).toISOString(),
          status: 'pending',
          created_by: normalizedRole || '',
        })
        .select()
        .single();

      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive"
        });
        return;
      }

      const event = result.data;

      setEvents([...events, event]);
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        venue: '',
        eventType: 'Technical'
      });
      setIsCreating(false);

      // Notify all roles via backend
      try {
        await fetch('/api/event/created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            eventName: event.event_name,
            creatorEmail: user?.email,
            creatorRole: user?.role || 'Unknown Role'
          })
        });
      } catch (err) {
        console.error('Failed to notify roles:', err);
      }

      toast({
        title: "Event Created",
        description: "Event has been created successfully. All team members will be notified and assigned their tasks.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const activateEvent = (eventId) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, status: 'active' }
        : event
    ));

    toast({
      title: "Event Activated",
      description: "Event has been activated. All team members have been notified and their tasks are now available.",
    });
  };

  // Allow both Chair Person and Vice Chairperson to create events
  const normalizedRole = user?.role?.toLowerCase().replace(/\s+/g, '');
  if (normalizedRole !== 'chairperson' && normalizedRole !== 'vicechairperson') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">Only Chair Person and Vice Chairperson can create and manage events.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Event Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Event Management</h2>
          <p className="text-gray-600">Create and manage club events</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Event
        </Button>
      </div>

      {/* Create Event Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <select
                  id="eventType"
                  value={newEvent.eventType}
                  onChange={(e) => setNewEvent({...newEvent, eventType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Enter event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({...newEvent, venue: e.target.value})}
                  placeholder="Enter venue"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateEvent} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Create Event
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Events</h3>
        {events.map((event) => (
          <Card key={event.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold">{event.event_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'active' ? 'bg-green-100 text-green-800' :
                      event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{event.event_desc}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Type:</span><br />
                      {event.event_type}
                    </div>
                    <div>
                      <span className="font-medium">Start Date:</span><br />
                      {new Date(event.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">End Date:</span><br />
                      {new Date(event.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Venue:</span><br />
                      {event.venue || 'TBD'}
                    </div>
                  </div>
                  
                  {/* Created by information */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Created by:</span> {event.created_by === 'chairperson' ? 'Chair Person' : 
                        event.created_by === 'vicechairperson' ? 'Vice Chairperson' : event.created_by}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {event.status === 'pending' && (
                    <Button 
                      onClick={() => activateEvent(event.id)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Activate Event
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventCreation;
