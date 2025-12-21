# Table Change Trigger Implementation

This implementation provides a custom loading trigger system that monitors database table changes and automatically refreshes data when specific fields like `status`, `current_reviewer`, or entire rows are modified or removed.

## Features

- **Polling-based monitoring**: Checks for table changes every 3-5 seconds (configurable)
- **Change detection**: Monitors changes in `status`, `current_reviewer`, `review_status`, and row removal
- **Custom loading UI**: Displays loading indicators when changes are detected
- **Automatic data refresh**: Triggers data refetch when changes are detected
- **Multi-table support**: Can monitor multiple tables simultaneously

## Components

### 1. `useTableChangeTrigger` Hook

A custom hook that monitors a single table for changes.

```javascript
import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';

const { isLoading, lastCheck, triggerManualCheck } = useTableChangeTrigger(
  'table_name',           // Table to monitor
  eventId,                // Event ID to filter by
  'Role Name',            // Role to monitor for
  async () => {           // Callback when changes detected
    await refreshData();
  },
  3000                    // Polling interval (ms)
);
```

### 2. `useMultiTableChangeTrigger` Hook

A hook that monitors multiple tables simultaneously.

```javascript
import { useMultiTableChangeTrigger } from '@/hooks/useTableChangeTrigger';

const tableConfigs = [
  {
    tableName: 'secretary_main',
    eventId: eventId,
    role: 'Secretary',
    onTableChange: async () => {
      await fetchEventDetailsAndTaskStatus();
    }
  },
  {
    tableName: 'vice_chair_main',
    eventId: eventId,
    role: 'Vice Chairperson',
    onTableChange: async () => {
      await refreshViceChairData();
    }
  }
];

const { isLoading, activeTables } = useMultiTableChangeTrigger(tableConfigs, 3000);
```

### 3. `TableChangeLoading` Component

A loading component that displays when table changes are detected.

```javascript
import TableChangeLoading from '@/components/TableChangeLoading';

<TableChangeLoading 
  isLoading={tableChangeLoading}
  message="Table data updated, refreshing..."
  activeTables={activeTables}
  showTableInfo={true}
/>
```

## Implementation Examples

### ChairPerson Component

The ChairPerson component monitors multiple tables:

```javascript
// Table change trigger for monitoring role tables
const tableConfigs = [
  {
    tableName: 'secretary_main',
    eventId: eventId,
    role: 'Chair Person',
    onTableChange: async () => {
      console.log('[ChairPerson] Secretary table changed, refreshing data...');
      await fetchEventDetailsAndTaskStatus(eventId);
      await fetchSocialPendingReviews();
    }
  },
  {
    tableName: 'vice_chair_main',
    eventId: eventId,
    role: 'Chair Person',
    onTableChange: async () => {
      console.log('[ChairPerson] Vice Chair table changed, refreshing data...');
      await fetchEventDetailsAndTaskStatus(eventId);
    }
  },
  // ... more tables
];

const { isLoading: tableChangeLoading, activeTables } = useMultiTableChangeTrigger(tableConfigs, 3000);
```

### ViceChairPerson Component

The ViceChairPerson component monitors its own table:

```javascript
// Table change trigger for monitoring vice_chair_main table
const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
  'vice_chair_main',
  eventId,
  'Vice Chairperson',
  async () => {
    console.log('[ViceChairPerson] Vice chair table changed, refreshing data...');
    await fetchEventDetailsAndTaskStatus(eventId, setEventInfo, setIsLoading, setTasks, setUploadedByYouMain, setTaskStatus, setSecretaryTasks);
  },
  3000
);
```

### Secretary Component

The Secretary component monitors its own table:

```javascript
// Table change trigger for monitoring secretary_main table
const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
  'secretary_main',
  eventId,
  'Secretary',
  async () => {
    console.log('[Secretary] Secretary table changed, refreshing data...');
    await fetchEventDetailsAndTaskStatus();
  },
  3000
);
```

## How It Works

1. **Polling**: The hook polls the database every 3-5 seconds to check for changes
2. **Change Detection**: Compares current data with previous data to detect:
   - Row removal (fewer rows than before)
   - Status changes (`status` field)
   - Reviewer changes (`current_reviewer` field)
   - Review status changes (`review_status` field)
3. **Loading Trigger**: When changes are detected:
   - Sets loading state to true
   - Calls the provided callback function
   - Shows loading UI to user
   - Resets loading state after 1 second
4. **Data Refresh**: The callback function typically refreshes the component's data

## Benefits

- **Real-time updates**: Users see changes without manual refresh
- **Non-intrusive**: Uses polling instead of real-time subscriptions
- **Configurable**: Adjustable polling intervals and monitoring scope
- **Visual feedback**: Clear loading indicators when data is being updated
- **Role-specific**: Each role monitors only relevant tables

## Usage Guidelines

1. **Import the hooks and components**:
   ```javascript
   import { useTableChangeTrigger, useMultiTableChangeTrigger } from '@/hooks/useTableChangeTrigger';
   import TableChangeLoading from '@/components/TableChangeLoading';
   ```

2. **Add the hook to your component**:
   ```javascript
   const { isLoading: tableChangeLoading } = useTableChangeTrigger(
     'your_table_name',
     eventId,
     'Your Role',
     async () => {
       await yourRefreshFunction();
     },
     3000
   );
   ```

3. **Add the loading component to your JSX**:
   ```javascript
   <TableChangeLoading 
     isLoading={tableChangeLoading}
     message="Data updated, refreshing..."
     activeTables={['your_table_name']}
     showTableInfo={false}
   />
   ```

4. **Configure the callback function** to refresh your component's data when changes are detected.

## Notes

- This implementation uses polling instead of Supabase real-time subscriptions for better control and reliability
- The polling interval can be adjusted based on your needs (default: 3000ms)
- The loading state automatically resets after 1 second
- Multiple tables can be monitored simultaneously using `useMultiTableChangeTrigger`
- The system is designed to be lightweight and not impact performance significantly 