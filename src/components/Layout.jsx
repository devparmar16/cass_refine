import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LogOut,
  User,
  Settings,
  Calendar as CalendarIcon,
  BarChart3,
  Menu,
  CalendarDays,
  X,
  Info,
  FileStack
} from 'lucide-react';
import Calendar from './Calendar';


const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return <Outlet />;
  }

  const isActive = (path) => location.pathname === path;
  const isCalendarPage = location.pathname === '/calendar';

  // Change dashboardPath to use underscores for spaces in user.role
  const dashboardPath = user?.role ? `/${user.role.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')}/dashboard` : '/dashboard';
        const handleLogoClick = (role) => {
          navigate(`/${role.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')}/dashboard`);
        };
  const navigationItems = [
    { path: dashboardPath, label: 'Dashboard', icon: BarChart3 },
    { path: '/events', label: 'Events', icon: CalendarIcon },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Build the correct dashboard path for the user's role
  const navigationItemsWithRole = [
    { path: dashboardPath, label: 'Dashboard', icon: BarChart3 },
    { path: '/events', label: 'Events', icon: CalendarIcon },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/aboutus', label: 'About Us', icon: Info }, // You can use any icon you like
    // Chair-only: Templates
    ...(user?.role === 'Chair Person' ? [{ path: '/chairperson/templates', label: 'Templates', icon: FileStack }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* IEEE CAS Official Logo */}
                <div className="top-0 h-18 relative">
                  <img
                    src="/logo/ieee_logo_final.png"
                    alt="IEEE Circuits and Systems Society"
                    className="h-19 w-40 align-center rounded-md"
                    onClick={() => handleLogoClick(user.role)}
                  />
                </div>
                
                {/* Text Logo */}
                
              </div>
            </div>

            {/* Desktop Navigation - Centered */}
            <nav className="hidden lg:flex lg:space-x-4">
              {navigationItemsWithRole.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    onClick={() => navigate(item.path)}
                    className="text-gray-900 hover:text-blue-600 flex items-center gap-2 text-sm px-4 py-2"
                    size="sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                );
              })}
              {/* Calendar Component - Only show when not on calendar page */}
              {!isCalendarPage && (
                <div className="flex items-center">
                  <Calendar />
                </div>
              )}
            </nav>

            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              {/* User info - hidden on mobile */}
              <div className="hidden sm:block text-right text-sm text-gray-700 mr-3">
                <div className="font-medium truncate max-w-32">{user.displayName}</div>
                <div className="text-xs text-gray-500 capitalize truncate">
                  {user.role.replace('_', ' ')}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profile_img || ''} alt={user?.displayName ?? "User"} />
                    <AvatarFallback className="text-xs">
                      {user?.displayName && typeof user.displayName === 'string'
                        ? user.displayName.charAt(0)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
                  <div className="sm:hidden p-2 border-b">
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
      
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer hover:bg-gray-50 text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              {navigationItemsWithRole.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-gray-900 hover:text-blue-600 h-12 text-base"
                    size="lg"
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
              {/* Calendar Component for Mobile - Only show when not on calendar page */}
              {!isCalendarPage && (
                <div className="px-3 py-2">
                  <Calendar />
                </div>
              )}
              {/* Mobile User Info */}
              <div className="sm:hidden pt-3 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profile_img || ''} alt={user?.displayName ?? "User"} />
                    <AvatarFallback className="text-sm">
                      {user?.displayName && typeof user.displayName === 'string'
                        ? user.displayName.charAt(0)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-3 sm:py-4 lg:py-6 px-3 sm:px-4 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
