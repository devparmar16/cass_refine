import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RolesProvider } from "@/contexts/RolesContext";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import { Suspense, lazy } from "react";
import AboutUs from './pages/AboutUs.jsx';
import EventTasksPage from "./components/EventTaskPage";
// Lazy load heavy components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Events = lazy(() => import("./pages/Events"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfileInfo = lazy(() => import("./pages/InfoForm"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const EventTasks = lazy(() => import('./pages/EventTasks'));
const TemplatesPage = lazy(() => import('./pages/chair/TemplatesPage'));

// Loading component for lazy routes - matches Dashboard skeleton style
const LoadingSpinner = () => (
  <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
    {/* Welcome section skeleton */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 animate-pulse">
      <div className="h-8 bg-blue-500 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-blue-500 rounded w-1/2"></div>
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Recent Activities skeleton */}
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Upcoming Events skeleton */}
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-col flex-1">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Quick Actions skeleton */}
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 sm:h-20 bg-gray-200 rounded flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <div className="h-4 w-4 sm:h-6 sm:w-6 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce network requests with longer cache time
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus only for important data
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations
      retry: 1,
    },
  },
});

// const ProtectedRoute = ({ children }) => {
//   const { user, loading, profileCompleted } = useAuth();
//   const location = useLocation();

//   if (loading) {
//     return (
//       <div className="w-full h-screen flex items-center justify-center">
//         Loading...
//       </div>
//     );
//   }

//   // If NOT logged in, allow only the login page
//   if (!user) {
//     return location.pathname === "/login"
//       ? children
//        to="/login" replace state={{ from }} />;
//   }

//   // If logged in but profile NOT completed, force redirect to /welcome
//   if (user && !profileCompleted) {
//     return location.pathname === "/welcome"
//       ? children
//        to="/welcome" replace />;
//   }

//   // If logged in and profile completed, prevent going back to /login or /welcome
//   if (user && profileCompleted) {
//     if (location.pathname === "/login" || location.pathname === "/welcome") {
//       return <Navigate to="/dashboard" replace />;
//     }
//     return {children}</Layout>;
//   }

//   return null;
// };


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RolesProvider>
          <BrowserRouter future={{ v7_startTransition: true }}>
            <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/welcome" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ProfileInfo />
              </Suspense>
            } />
            <Route path="/complete-profile" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ProfileInfo />
              </Suspense>
            } />
            {/* <Route path="/aboutus" element={<AboutUs />} /> */}

            {/* Registration Desk Team Table Entry (removed) */}
            <Route path=":task_id/table" element={<Navigate to="/events" replace />} />

            {/* Protected Routes with Navbar */}
            <Route element={<Layout />}>
              <Route path="/:role/dashboard" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="/profile" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              } />
              <Route path="/events" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Events />
                </Suspense>
              } />
              <Route path="/calendar" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CalendarPage />
                </Suspense>
              } />
              <Route path="/aboutus" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AboutUs />
                </Suspense>} />
              <Route path="/event-tasks/:eventId" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <EventTasksPage />
                </Suspense>
              } />
              <Route path="/event-tasks/:eventId/:role/:section" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <EventTasks />
                </Suspense>
              } />
              {/* Chair-only Templates page */}
              <Route path="/chairperson/templates" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <TemplatesPage />
                </Suspense>
              } />
            </Route>

            {/* <Route path="/" element={<Navigate to="/dashboard" replace />} /> */}
            <Route path="*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            } />
            </Routes>
          </BrowserRouter>
        </RolesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;