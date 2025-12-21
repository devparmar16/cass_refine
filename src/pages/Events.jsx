import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Add fade-in animation CSS (same as task sections)
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;
import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarIcon,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Edit,
  Trash2,
  ArrowLeft,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';


export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Inject the fade-in animation CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = fadeInStyle;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [events, setEvents] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPendingTasks, setIsLoadingPendingTasks] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [chairUploads, setChairUploads] = useState({});
  const [lockedEvents, setLockedEvents] = useState({});
  const [pendingTasksForLock, setPendingTasksForLock] = useState([]);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [selectedEventForLock, setSelectedEventForLock] = useState(null);
  const navigate = useNavigate();
  
  // Normalize role for consistent comparison
  const normalizedRole = useMemo(() => 
    user?.role?.toLowerCase().replace(/\s+/g, ''), 
    [user?.role]
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;
  
  // Memoized pagination calculations
  const { totalPages, currentEvents } = useMemo(() => {
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
    
    return { totalPages, currentEvents };
  }, [events, currentPage]);

  // Pagination navigation functions
  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPage = useCallback((pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  }, [totalPages]);

  // Add to state: track locked status
  // const [lockedEvents, setLockedEvents] = useState({}); // Moved to top
  
  // Lock confirmation dialog state
  // const [lockDialogOpen, setLockDialogOpen] = useState(false); // Moved to top
  // const [selectedEventForLock, setSelectedEventForLock] = useState(null); // Moved to top
  // const [pendingTasksForLock, setPendingTasksForLock] = useState([]); // Moved to top
  // const [isLoadingPendingTasks, setIsLoadingPendingTasks] = useState(false); // Moved to top

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
          console.error('Error fetching events:', error);
          toast({ 
            title: 'Failed to load events', 
            description: error.message, 
            variant: 'destructive' 
          });
        return;
      }

      if (data) {
        setEvents(data);
        // Track locked status
        const lockedMap = {};
          data.forEach(ev => { 
            lockedMap[ev.id] = !!ev.locked; 
          });
        setLockedEvents(lockedMap);
        }
      } catch (error) {
        console.error('Unexpected error fetching events:', error);
        toast({ 
          title: 'Failed to load events', 
          description: 'An unexpected error occurred', 
          variant: 'destructive' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // Function to fetch pending tasks for an event
  const fetchPendingTasksForEvent = useCallback(async (eventId, eventName) => {
    try {
    setIsLoadingPendingTasks(true);
    const pendingTasks = [];

      // Check all role tables for pending tasks
      const tables = ['chair_main', 'vice_chair_main', 'secretary_main', 'treasurer_main', 'tech_coord_main', 'event_coord_main', 'social_main'];
      
      // Use Promise.all for parallel requests instead of sequential
      const tablePromises = tables.map(async (table) => {
        try {
        const { data, error } = await supabase
          .from(table)
          .select('task_name, status, current_reviewer')
          .eq('event_name', eventName)
          .eq('status', 'pending');
        
        if (!error && data) {
            return data.map(task => ({
            ...task,
            tableName: table
            }));
          }
          return [];
        } catch (error) {
          console.error(`Error fetching from ${table}:`, error);
          return [];
        }
      });

      const results = await Promise.all(tablePromises);
      const allPendingTasks = results.flat();
      
      setPendingTasksForLock(allPendingTasks);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      toast({ 
        title: 'Failed to fetch pending tasks', 
        description: 'Please try again', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoadingPendingTasks(false);
    }
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple validation
    let hasError = false;
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Please enter an event name.";
      hasError = true;
    }
    if (!description.trim()) {
      newErrors.description = "Please enter a description.";
      hasError = true;
    }
    if (!date) {
      newErrors.date = "Please select a date.";
      hasError = true;
    }
    setErrors(newErrors);
    if (hasError) return;

    setIsSubmitting(true);

    // Add event to database
    let eventData = null;
    let eventError = null;
    try {
      const result = await supabase
        .from('events')
        .insert({
          event_name: name,
          event_desc: description,
          event_date: date ? new Date(date).toISOString() : null,
          status: 'pending',
          created_by: normalizedRole || '',
        })
        .select()
        .single();
      eventData = result.data;
      eventError = result.error;
    } catch (err) {
      eventError = err;
    }

    setIsSubmitting(false);

    if (eventError) {
      toast({ title: 'Error', description: eventError.message || String(eventError), variant: 'destructive' });
      return;
    }

    if (eventData) {
      setEvents((prev) => [...prev, eventData]);
      setName('');
      setDescription('');
      setDate(undefined);
      setDialogOpen(false);
      toast({ title: 'Event Created', description: 'Successfully saved to database.' });
      
      // Refresh calendar events if the function exists
      if (window.refreshCalendarEvents) {
        window.refreshCalendarEvents();
      }
      
      // Notify all roles via backend
      try {
        await fetch('/api/event/created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: eventData.id,
            eventName: eventData.event_name,
            creatorEmail: user?.email,
            creatorRole: user?.role || 'Unknown Role'
          })
        });
      } catch (err) {
        console.error('Failed to notify roles:', err);
      }
      
      // Create event folder structure in Google Drive
      try {
        const ROOT_FOLDER_ID = '1cFqyi-cSRNAQ1O7aQQVVhZR5oQKQ61J-';
        const res = await fetch('/api/drive/create-event-folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: eventData.event_name, rootId: ROOT_FOLDER_ID }),
        });
        if (!res.ok) throw new Error('Failed to create event folders in Drive');
        toast({ title: 'Drive Folders Created', description: 'Google Drive folder structure created.' });
      } catch (err) {
        toast({ title: 'Drive Folder Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  // Helper functions for status and icons
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'pending':
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <FileText className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  }, []);

  // Optimized delete handler
  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting event:', error);
        toast({ 
          title: 'Failed to delete event', 
          description: error.message, 
          variant: 'destructive' 
        });
        return;
      }

      setEvents((prev) => {
        const updated = prev.filter((ev) => ev.id !== id);
        // After updating, check if the current page is now empty
        const newTotalPages = Math.ceil(updated.length / eventsPerPage);
        if (currentPage > newTotalPages && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        return updated;
      });
      toast({ title: 'Event Deleted', description: 'Event removed successfully.' });
    } catch (error) {
      console.error('Unexpected error deleting event:', error);
      toast({ 
        title: 'Failed to delete event', 
        description: 'An unexpected error occurred', 
        variant: 'destructive' 
      });
    }
  }, [supabase, toast, currentPage, eventsPerPage]);

  const handleFileChange = (key, file) => {
    setChairUploads((prev) => ({ ...prev, [key]: file }));
  };

  // Lock event handler with confirmation dialog
  const handleLockEventClick = useCallback(async (event) => {
    setSelectedEventForLock(event);
    await fetchPendingTasksForEvent(event.id, event.event_name);
    setLockDialogOpen(true);
  }, [fetchPendingTasksForEvent]);

  // Confirm lock event
  const handleConfirmLockEvent = useCallback(async () => {
    if (!selectedEventForLock) return;

    try {
      // Step 1: Update events table to lock the event
      const { error: lockError } = await supabase
        .from('events')
        .update({ locked: true })
        .eq('id', selectedEventForLock.id);
      
      if (lockError) {
        toast({ title: 'Failed to lock event', description: lockError.message, variant: 'destructive' });
        return;
      }

      // Step 2: Fetch task data from all role tables and insert into locked_events
      const eventId = selectedEventForLock.id;
      
      // Fetch data from each role table
      const roleTables = [
        'chair_main',
        'vice_chair_main', 
        'secretary_main',
        'treasurer_main',
        'event_coord_main',
        'tech_coord_main',
        'social_main'
      ];

      const roleColumns = [
        'chair',
        'vice_chair',
        'secretary', 
        'treasurer',
        'event_coord',
        'tech_coord',
        'social_media'
      ];

      // Prepare the locked_events record
      const lockedEventData = {
        event_id: eventId,
        created_at: new Date().toISOString()
      };

      // Fetch and add data for each role
      for (let i = 0; i < roleTables.length; i++) {
        const tableName = roleTables[i];
        const columnName = roleColumns[i];
        
        try {
          const { data: roleData, error: roleError } = await supabase
            .from(tableName)
            .select('task_name, file_link')
            .eq('event_id', eventId);
          
          if (!roleError && roleData && roleData.length > 0) {
            // Store task_name and file_link data for this role
            lockedEventData[columnName] = roleData.map(row => ({
              task_name: row.task_name,
              file_link: row.file_link
            }));
          } else {
            // No data for this role, set as empty array
            lockedEventData[columnName] = [];
          }
        } catch (err) {
          console.error(`Error fetching data from ${tableName}:`, err);
          lockedEventData[columnName] = [];
        }
      }

      // Step 3: Insert into locked_events table
      const { error: insertError } = await supabase
        .from('locked_events')
        .insert(lockedEventData);
      
      if (insertError) {
        console.error('Error inserting into locked_events:', insertError);
        toast({ title: 'Warning', description: 'Event locked but failed to save task data.', variant: 'destructive' });
      }
      
      setLockedEvents((prev) => ({ ...prev, [selectedEventForLock.id]: true }));
      setLockDialogOpen(false);
      setSelectedEventForLock(null);
      setPendingTasksForLock([]);
      toast({ title: 'Event Locked', description: 'This event is now read-only for all roles.' });
      
    } catch (error) {
      console.error('Error in handleConfirmLockEvent:', error);
      toast({ title: 'Failed to lock event', description: error.message, variant: 'destructive' });
    }
  }, [selectedEventForLock, fetchPendingTasksForEvent, supabase, toast]);

  // Unlock event handler
  const handleUnlockEvent = useCallback(async (eventId) => {
    try {
      // Step 1: Update events table to unlock the event
      const { error: unlockError } = await supabase
        .from('events')
        .update({ locked: false })
        .eq('id', eventId);
      
      if (unlockError) {
        toast({ title: 'Failed to unlock event', description: unlockError.message, variant: 'destructive' });
        return;
      }

      // Step 2: Remove the record from locked_events table
      const { error: deleteError } = await supabase
        .from('locked_events')
        .delete()
        .eq('event_id', eventId);
      
      if (deleteError) {
        console.error('Error deleting from locked_events:', deleteError);
        toast({ title: 'Warning', description: 'Event unlocked but failed to remove lock data.', variant: 'destructive' });
      }
      
      setLockedEvents((prev) => ({ ...prev, [eventId]: false }));
      toast({ title: 'Event Unlocked', description: 'All functionalities are now restored.' });
      
    } catch (error) {
      console.error('Error in handleUnlockEvent:', error);
      toast({ title: 'Failed to unlock event', description: error.message, variant: 'destructive' });
    }
  }, [supabase, toast]);

  // Memoized event card component for better performance
  const EventCard = useCallback(({ ev, index }) => (
    <Card 
      key={ev.id} 
      className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-1 min-w-0">
            <span className="truncate">{ev.event_name}</span>
            {lockedEvents[ev.id] && <Lock className="h-4 w-4 text-gray-500 flex-shrink-0" title="Locked" />}
          </CardTitle>
          <Badge className={`flex items-center gap-1 ${getStatusColor(ev.status)} text-xs sm:text-sm`}>
            {getStatusIcon(ev.status)}
            <span className="hidden sm:inline">{ev.status}</span>
            <span className="sm:hidden">{ev.status.charAt(0).toUpperCase()}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{ev.event_desc}</p>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">{format(new Date(ev.event_date), 'MMMM dd, yyyy')}</span>
        </div>
        
        {/* Created by information */}
        {ev.created_by && (
          <div className="text-xs sm:text-sm text-gray-500">
            <span className="font-medium">Created by:</span> 
            <span className="truncate ml-1">
              {ev.created_by === 'chairperson' ? 'Chair Person' : 
                ev.created_by === 'vicechairperson' ? 'Vice Chairperson' : ev.created_by}
            </span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" className="flex-1 text-xs sm:text-sm" onClick={() => {
            const roleStr = user?.role?.replace(/\s+/g, '').toLowerCase();
            navigate(`/event-tasks/${ev.id}/${roleStr}/mytasks`);
          }}>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
            <span className="hidden sm:inline">View Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </Button>
          {user?.role === 'Chair Person' && !lockedEvents[ev.id] && (
            <Button variant="secondary" size="sm" onClick={() => handleLockEventClick(ev)} className="text-xs sm:text-sm">
              <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
              <span className="hidden sm:inline">Lock Event</span>
              <span className="sm:hidden">Lock</span>
            </Button>
          )}
          {user?.role === 'Chair Person' && lockedEvents[ev.id] && (
            <Button variant="outline" size="sm" onClick={() => handleUnlockEvent(ev.id)} className="text-xs sm:text-sm">
              <Unlock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
              <span className="hidden sm:inline">Unlock Event</span>
              <span className="sm:hidden">Unlock</span>
            </Button>
          )}
          {user?.role === 'Chair Person' && (
            <Button variant="destructive" size="sm" onClick={() => handleDelete(ev.id)} disabled={lockedEvents[ev.id]} className="text-xs sm:text-sm">
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  ), [lockedEvents, user?.role, navigate, handleLockEventClick, handleUnlockEvent, handleDelete, getStatusColor, getStatusIcon]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage and track all club events</p>
        </div>
        {(normalizedRole === 'chairperson' || normalizedRole === 'vicechairperson') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm sm:text-base">
              <Plus className="h-4 w-4" /> 
              <span className="hidden sm:inline">Create New Event</span>
              <span className="sm:hidden">Create Event</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="AI Workshop 2025" />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Popover>
                    <PopoverTrigger className={cn(
                      "w-full justify-start text-left font-normal inline-flex items-center px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md",
                      !date && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3" disabled={(d) => d < new Date()} />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
                </div>
                <DialogFooter className="pt-2 flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Event"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-gray-500 space-y-4">
          <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
          <p className="text-base sm:text-lg font-medium">No events found</p>
          <p className="text-sm text-center">Create a new event to begin.</p>
        </div>
      ) : (
        <>
          <div className="transition-all duration-300 ease-in-out">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {currentEvents.map((ev, index) => (
                            <EventCard 
                key={ev.id || index}
                ev={ev} 
                index={index} 
              />
            ))}
            </div>
          </div>
          {/* Enhanced Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 sm:mt-8">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Previous Arrow */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md border transition-all duration-200 ease-in-out transform hover:scale-105 ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i + 1)}
                      className={`px-2 sm:px-3 py-2 rounded-md border transition-all duration-200 ease-in-out transform hover:scale-105 text-xs sm:text-sm ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                      aria-label={`Go to page ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Next Arrow */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md border transition-all duration-200 ease-in-out transform hover:scale-105 ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  aria-label="Go to next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Lock Event - {selectedEventForLock?.event_name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-orange-800 font-medium mb-2">⚠️ Warning: You are about to close this event</p>
                  <p className="text-orange-700 text-sm">
                    Once locked, all upload buttons, approve buttons, reject buttons, remove buttons, and reupload buttons 
                    will be disabled for all roles. This action cannot be undone until you manually unlock the event.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Pending Tasks for Review:</h4>
                  {isLoadingPendingTasks ? (
                    <div className="text-gray-500 text-sm">Loading pending tasks...</div>
                  ) : pendingTasksForLock.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {pendingTasksForLock.map((task, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{task.task_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.tableName?.replace('_main', '').replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {task.status} | Reviewer: {task.current_reviewer || 'Not assigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                      ✅ No pending tasks found. All tasks are either completed or approved.
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmLockEvent}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Lock Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}