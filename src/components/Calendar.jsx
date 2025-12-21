import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon, PlusIcon, EditIcon, TrashIcon, FileText, CalendarDays, ChevronDown, Maximize2, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-day-picker/dist/style.css';

const Calendar = ({ className = "" }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState({});
  const [events, setEvents] = useState({});
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on the full calendar page
  const isFullCalendarPage = useMemo(() => 
    location.pathname === '/calendar', 
    [location.pathname]
  );

  // Check if user is chair person - memoized for performance
  const isChairPerson = useMemo(() => 
    user?.user_metadata?.role === 'Chair Person' || 
    user?.role === 'Chair Person' || 
    user?.disp_name?.includes('Chair') ||
    user?.email?.includes('chair') ||
    user?.username?.includes('chair'),
    [user]
  );

  // Optimized fetch notes function
  const fetchNotes = useCallback(async (date) => {
    try {
      setLoading(true);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      console.log('Fetching notes for:', `${year}${month}%`);
      
      // Fetch notes for the entire month
      const { data, error } = await supabase
        .from('calendar')
        .select('*')
        .like('key', `${year}${month}%`);

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      console.log('Fetched notes data:', data);

      // Convert to object with date as key, supporting multiple notes per date
      const notesObj = {};
      data?.forEach(note => {
        const dateKey = note.key;
        if (!notesObj[dateKey]) {
          notesObj[dateKey] = [];
        }
        // Handle both single notes and arrays of notes
        if (Array.isArray(note.note)) {
          // If note.note is already an array, spread it
          notesObj[dateKey] = [...notesObj[dateKey], ...note.note];
        } else {
          // If note.note is a single note object, add it to array
          notesObj[dateKey].push(note.note);
        }
      });

      console.log('Processed notes object:', notesObj);
      setNotes(notesObj);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized fetch events function
  const fetchEvents = useCallback(async (date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // Create date range for the month
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString(); // Last day of the month
      
      console.log('Fetching events for date range:', startDate, 'to', endDate);
      
      // Fetch events for the entire month using date range
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate);

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      console.log('Fetched events data:', data);
      console.log('Number of events found:', data?.length || 0);

      // Convert to object with date as key
      const eventsObj = {};
      data?.forEach(event => {
        console.log('Processing event:', event.event_name, 'with date:', event.event_date);
        const eventDate = new Date(event.event_date);
        const dateKey = `${year}${String(month).padStart(2, '0')}${String(eventDate.getDate()).padStart(2, '0')}`;
        console.log('Generated dateKey:', dateKey);
        
        if (!eventsObj[dateKey]) {
          eventsObj[dateKey] = [];
        }
        eventsObj[dateKey].push(event);
      });

      console.log('Processed events object:', eventsObj);
      console.log('Events object keys:', Object.keys(eventsObj));
      setEvents(eventsObj);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  // Save note to Supabase
  const saveNote = async () => {
    if (!noteTitle.trim() || !noteDescription.trim()) return;

    // Check if user is chair person before saving
    if (!isChairPerson) {
      alert('Only Chair Person can save notes.');
      return;
    }

    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const key = `${year}${month}${day}`;

      console.log('Saving note with key:', key);
      console.log('User role check:', isChairPerson);
      console.log('User object:', user);

      const newNoteData = {
        title: noteTitle.trim(),
        desc: noteDescription.trim()
      };

      // Check if a note already exists for this date
      const { data: existingData, error: fetchError } = await supabase
        .from('calendar')
        .select('note')
        .eq('key', key)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing note:', fetchError);
        alert('Failed to check existing notes: ' + (fetchError.message || 'Unknown error'));
        return;
      }

      let updatedNoteData;
      if (existingData && existingData.note) {
        // If note exists, append to the existing array
        const existingNotes = Array.isArray(existingData.note) ? existingData.note : [existingData.note];
        updatedNoteData = [...existingNotes, newNoteData];
        console.log('Appending to existing notes:', updatedNoteData);
      } else {
        // If no note exists, create new array with single note
        updatedNoteData = [newNoteData];
        console.log('Creating new notes array:', updatedNoteData);
      }

      // Upsert the note data
      const { data, error } = await supabase
        .from('calendar')
        .upsert([{ key, note: updatedNoteData }], { onConflict: 'key' })
        .select();

      if (error) {
        console.error('Error saving note:', error);
        if (error.message?.includes('404') || error.code === 'PGRST116') {
          alert('Calendar table not found. Please run the SQL setup first.');
        } else {
          alert('Failed to save note: ' + (error.message || 'Unknown error'));
        }
        return;
      }

      console.log('Note saved successfully:', data);

      // Refresh notes
      await fetchNotes(selectedDate);
      setShowNoteDialog(false);
      resetForm();
      
      // Update the current note state with the new data
      setCurrentNote(updatedNoteData);
      
      // Reopen the view dialog to show the updated notes
      setShowViewDialog(true);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note: ' + (error.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  // Delete note from Supabase
  const deleteNote = async () => {
    // Check if user is chair person before deleting
    if (!isChairPerson) {
      alert('Only Chair Person can delete notes.');
      return;
    }

    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const key = `${year}${month}${day}`;

      // For now, delete all notes for the date
      // In the future, you could add individual note deletion
      const { error } = await supabase
        .from('calendar')
        .delete()
        .eq('key', key);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      // Refresh notes
      await fetchNotes(selectedDate);
      setShowNoteDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete individual note
  const deleteIndividualNote = async (noteIndex) => {
    // Check if user is chair person before deleting
    if (!isChairPerson) {
      alert('Only Chair Person can delete notes.');
      return;
    }

    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const key = `${year}${month}${day}`;

      // Get current notes for this date
      const { data: existingData, error: fetchError } = await supabase
        .from('calendar')
        .select('note')
        .eq('key', key)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing notes:', fetchError);
        alert('Failed to fetch existing notes: ' + (fetchError.message || 'Unknown error'));
        return;
      }

      if (!existingData || !existingData.note) {
        alert('No notes found to delete.');
        return;
      }

      // Remove the specific note from the array
      const existingNotes = Array.isArray(existingData.note) ? existingData.note : [existingData.note];
      const updatedNotes = existingNotes.filter((_, index) => index !== noteIndex);

      if (updatedNotes.length === 0) {
        // If no notes left, delete the entire record
        const { error } = await supabase
          .from('calendar')
          .delete()
          .eq('key', key);

        if (error) {
          console.error('Error deleting calendar record:', error);
          alert('Failed to delete note: ' + (error.message || 'Unknown error'));
          return;
        }
      } else {
        // Update the record with the remaining notes
        const { error } = await supabase
          .from('calendar')
          .upsert([{ key, note: updatedNotes }], { onConflict: 'key' })
          .select();

        if (error) {
          console.error('Error updating notes:', error);
          alert('Failed to delete note: ' + (error.message || 'Unknown error'));
          return;
        }
      }

      // Refresh notes
      await fetchNotes(selectedDate);
      
      // Update current note state
      setCurrentNote(updatedNotes);
      
      console.log('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note: ' + (error.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNoteTitle('');
    setNoteDescription('');
    setCurrentNote(null);
    setIsEditing(false);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!date) return;
    
    setSelectedDate(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}${month}${day}`;
    
    const existingNotes = notes[key] || [];
    const existingEvents = events[key] || [];
    
    // For all users, show the view dialog
    setCurrentNote(existingNotes);
    setShowViewDialog(true);
  };

  // Custom click handler for calendar days
  const handleDayClick = (date) => {
    if (!date) return;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}${month}${day}`;
    
    const existingNotes = notes[key] || [];
    const existingEvents = events[key] || [];
    
    // For all users, show the view dialog
    setCurrentNote(existingNotes);
    setShowViewDialog(true);
  };

  // Custom day renderer to show note indicators
  const DayContent = ({ date, displayMonth }) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}${month}${day}`;
    const dayNotes = notes[key] || [];
    const dayEvents = events[key] || [];
    const hasNotes = dayNotes.length > 0;
    const hasEvents = dayEvents.length > 0;

    // Debug logging for specific dates
    if (hasEvents) {
      console.log(`Day ${key} has ${dayEvents.length} events:`, dayEvents.map(e => e.event_name));
    }

    return (
      <div 
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
        onClick={() => handleDayClick(date)}
      >
        <span className="text-sm font-medium">{date.getDate()}</span>
        
        {/* Event and Note dots - 50% overlap stacking */}
        <div className="absolute -top-1 -right-1">
          {hasEvents && (
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm border border-white"></div>
          )}
          {hasNotes && (
            <div className="w-3 h-3 bg-purple-500 rounded-full shadow-sm border border-white absolute -top-1 -right-2"></div>
          )}
        </div>
      </div>
    );
  };

  // Load notes when component mounts or month changes
  useEffect(() => {
    fetchNotes(selectedDate);
    fetchEvents(selectedDate);
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // Refresh events periodically to catch new events
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchEvents(selectedDate);
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // Manual refresh function for events
  const refreshEvents = () => {
    fetchEvents(selectedDate);
  };

  // Expose refresh function globally for external use
  useEffect(() => {
    window.refreshCalendarEvents = refreshEvents;
    return () => {
      delete window.refreshCalendarEvents;
    };
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // Handle clicking outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close dropdown if any modal is open
      if (showViewDialog || showNoteDialog) {
        return;
      }
      
      // Check if clicking on modal backdrop or modal content
      const isModalBackdrop = event.target.closest('[data-radix-dialog-overlay]');
      const isModalContent = event.target.closest('[data-radix-dialog-content]');
      const isModalPortal = event.target.closest('[role="dialog"]');
      
      // Don't close if clicking on any modal-related elements
      if (isModalBackdrop || isModalContent || isModalPortal) {
        return;
      }
      
      // Only close if clicking outside the entire calendar popup container
      // Don't close if clicking inside the calendar, the calendar icon button, or any modal
      if (showCalendarPopup && 
          !event.target.closest('.calendar-popup-container') && 
          !event.target.closest('button[onClick*="setShowCalendarPopup"]') &&
          !event.target.closest('[role="dialog"]') &&
          !event.target.closest('.modal') &&
          !event.target.closest('[data-radix-dialog-content]')) {
        setShowCalendarPopup(false);
      }
    };

    if (showCalendarPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendarPopup, showViewDialog, showNoteDialog]);

  return (
    <div className={`${isFullCalendarPage ? 'w-full h-full' : 'relative'} ${className}`}>
      {isFullCalendarPage ? (
        // Full Calendar Page
        <div className="w-full h-full">
          <Card className="w-full h-full shadow-sm border bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="pb-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                Event Calendar
              </CardTitle>
              <p className="text-purple-100 text-sm">
                {isChairPerson ? "Click any date to manage notes" : "View notes added by Chair Person"}
              </p>
              {Object.keys(notes).length > 0 && (
                <div className="text-purple-100 text-xs">
                  {Object.keys(notes).length} note{Object.keys(notes).length !== 1 ? 's' : ''} this month
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4 w-full h-full flex flex-col">
              {loading && (
                <div className="flex items-center justify-center mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-purple-600 text-sm font-medium">Loading notes...</span>
                </div>
              )}
              
              <div className="w-full h-full flex-1 -ml-2" style={{ minHeight: 0 }}>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="w-full h-full"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full h-full flex-1",
                    month: "space-y-2 w-full h-full flex-1",
                    caption: "flex justify-center pt-1 relative items-center mb-4",
                    caption_label: "text-lg font-semibold",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 p-0 rounded-md transition-colors",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full h-full border-collapse space-y-1 flex-1",
                    head_row: "flex mb-2 w-full",
                    head_cell: "text-muted-foreground rounded-md font-semibold text-sm flex-1 text-center",
                    row: "flex w-full mt-2 flex-1",
                    cell: "relative p-1 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-gradient-to-r [&:has([aria-selected])]:from-purple-50 [&:has([aria-selected])]:to-pink-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md flex-1 h-full",
                    day: "h-full w-full p-2 font-normal aria-selected:opacity-100 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-md transition-colors cursor-pointer flex items-center justify-center text-base",
                    day_selected: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:from-purple-700 focus:to-indigo-700",
                    day_today: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold ring-2 ring-yellow-300",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-gradient-to-r aria-selected:from-purple-100 aria-selected:to-pink-100 aria-selected:text-foreground",
                    day_hidden: "invisible",
                  }}
                  components={{
                    DayContent: DayContent
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Popup Calendar
        <>
          {/* Calendar Icon Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Calendar icon clicked, current state:', showCalendarPopup);
              setShowCalendarPopup(!showCalendarPopup);
              console.log('New state will be:', !showCalendarPopup);
            }}
            className="flex items-center justify-center bg-white hover:bg-gray-50 border-gray-200 w-8 h-8 p-0"
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>

          {/* Calendar Popup */}
          {showCalendarPopup && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 calendar-popup-container">
              <Card className="w-96 shadow-lg border bg-white">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <CalendarIcon className="w-5 h-5" />
                      Event Calendar
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/calendar')}
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      title="Open full calendar"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-purple-100 text-xs">
                    {isChairPerson ? "Click any date to manage notes" : "View notes added by Chair Person"}
                  </p>
                </CardHeader>
                
                <CardContent className="p-3">
                  {loading && (
                    <div className="flex items-center justify-center mb-3 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-purple-600 text-xs font-medium">Loading notes...</span>
                    </div>
                  )}
                  
                  <div className="calendar-container w-full h-full -ml-2">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="w-full h-full"
                      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                      classNames={{
                        months: "flex flex-col space-y-2 w-full h-full flex-1",
                        month: "space-y-2 w-full h-full flex-1",
                        caption: "flex justify-center pt-1 relative items-center mb-2",
                        caption_label: "text-sm font-semibold",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-6 w-6 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 p-0 rounded-md transition-colors",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full h-full border-collapse space-y-1 flex-1",
                        head_row: "flex mb-2 w-full",
                        head_cell: "text-muted-foreground rounded-md font-semibold text-xs flex-1 text-center",
                        row: "flex w-full mt-2 flex-1",
                        cell: "relative p-1 text-center text-xs focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-gradient-to-r [&:has([aria-selected])]:from-purple-50 [&:has([aria-selected])]:to-pink-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md flex-1 h-full",
                        day: "h-full w-full p-1 font-normal aria-selected:opacity-100 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-md transition-colors cursor-pointer flex items-center justify-center text-xs",
                        day_selected: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 focus:from-purple-700 focus:to-indigo-700",
                        day_today: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold ring-1 ring-yellow-300",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-gradient-to-r aria-selected:from-purple-100 aria-selected:to-pink-100 aria-selected:text-foreground",
                        day_hidden: "invisible",
                      }}
                      components={{
                        DayContent: DayContent
                      }}
                    />
                  </div>
                </CardContent>
                
                {/* Close Button */}
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCalendarPopup(false)}
                    className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    <span className="text-xs">Close Calendar</span>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* View Note Dialog */}
      <Dialog open={showViewDialog} onOpenChange={(open) => {
        setShowViewDialog(open);
        // Don't close the calendar popup when view dialog closes
      }}>
        <DialogContent className={`${isFullCalendarPage ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-gradient-to-br from-white to-purple-50/30`}>
          <DialogHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              Notes - {format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-3">
            {(() => {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const key = `${year}${month}${day}`;
              const dayNotes = notes[key] || [];
              const dayEvents = events[key] || [];
              const hasContent = dayNotes.length > 0 || dayEvents.length > 0;
              
              console.log(`View dialog for date ${key}:`, {
                dayNotes: dayNotes.length,
                dayEvents: dayEvents.length,
                hasContent,
                events: dayEvents.map(e => ({ name: e.event_name, date: e.event_date }))
              });
              
              if (hasContent) {
                return (
                  <div className={`${isFullCalendarPage ? 'max-h-96' : 'max-h-64'} overflow-y-auto space-y-2 pr-2`}>
                    {/* Events Section */}
                    {dayEvents.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                          Events ({dayEvents.length})
                        </h3>
                        <div className="space-y-2">
                          {dayEvents.map((event, index) => (
                            <div key={`event-${index}`} className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-semibold text-foreground text-sm">
                                    {event.event_name || 'No title'}
                                  </h4>
                                  <span className="text-xs text-white bg-gradient-to-r from-green-500 to-blue-500 px-3 py-1 rounded-full font-medium shadow-sm">
                                    Event
                                  </span>
                                </div>
                                
                                <div className="mt-1">
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {event.event_desc || 'No description'}
                                  </p>
                                  {event.created_by && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Created by: {event.created_by}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Notes Section */}
                    {dayNotes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                          Notes ({dayNotes.length})
                        </h3>
                        <div className="space-y-2">
                          {dayNotes.map((note, index) => (
                            <div key={`note-${index}`} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-semibold text-foreground text-sm">
                                    {note.title || 'No title'}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full font-medium shadow-sm">
                                      Chair Person
                                    </span>
                                    {isChairPerson && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteIndividualNote(index)}
                                        disabled={loading}
                                        className="h-5 w-5 p-0 bg-red-500 hover:bg-red-600"
                                      >
                                        <TrashIcon className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-1">
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {note.desc || 'No description'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium text-sm">No notes or events created yet for this date.</p>
                    <p className="text-muted-foreground text-xs mt-1">Click "Add Note" to create your first note!</p>
                  </div>
                );
              }
            })()}
          </div>
   
          <DialogFooter className="pt-3">
            {isChairPerson && (
              <Button
                onClick={() => {
                  setShowViewDialog(false);
                  setShowNoteDialog(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm"
              >
                <PlusIcon className="w-3 h-3" />
                Add Note
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
              className="flex-1 text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={(open) => {
        setShowNoteDialog(open);
        // Don't close the calendar popup when note dialog closes
      }}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-purple-50/30">
          <DialogHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              {isEditing ? (isChairPerson ? 'Edit Note' : 'View Note') : 'Add Note'} - {format(selectedDate, 'MMMM d, yyyy')}
              {!isChairPerson && (
                <Badge variant="secondary" className="ml-2 text-xs bg-white/20 border-white/30">
                  Read Only
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Title
              </label>
              <Input
                placeholder="Enter note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                disabled={!isChairPerson}
                className={`${!isChairPerson ? 'bg-muted cursor-not-allowed' : ''} focus:border-purple-500`}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Description
              </label>
              <Textarea
                placeholder="Enter note description..."
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
                disabled={!isChairPerson}
                className={`min-h-[100px] resize-none ${!isChairPerson ? 'bg-muted cursor-not-allowed' : ''} focus:border-purple-500`}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-3">
            {isEditing && isChairPerson && (
              <Button
                variant="destructive"
                onClick={deleteNote}
                disabled={loading}
                className="flex items-center gap-2 text-sm"
              >
                <TrashIcon className="w-3 h-3" />
                Delete Note
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                resetForm();
              }}
              disabled={loading}
              className="flex-1 text-sm"
            >
              Cancel
            </Button>
            
            {isChairPerson && (
              <Button
                onClick={saveNote}
                disabled={loading || !noteTitle.trim() || !noteDescription.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm"
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isEditing ? <EditIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
                    {isEditing ? 'Update Note' : 'Save Note'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar; 