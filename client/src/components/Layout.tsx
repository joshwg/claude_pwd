import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Users, 
  User, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Lock,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationExpanded, setNavigationExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: location.pathname === '/dashboard' },
    { name: 'Tags', href: '/tags', icon: Tag, current: location.pathname === '/tags' },
    { name: 'Profile', href: '/profile', icon: User, current: location.pathname === '/profile' },
  ];

  if (user?.isAdmin) {
    navigation.push({
      name: 'Users',
      href: '/admin',
      icon: Users,
      current: location.pathname === '/admin'
    });
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar for mobile */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Lock className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Password Manager</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user?.isAdmin ? (
                  <Shield className="h-8 w-8 text-blue-600" />
                ) : (
                  <User className="h-8 w-8 text-gray-600" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{user?.name}</p>
                <p className="text-sm font-medium text-gray-500">
                  {user?.isAdmin ? 'Administrator' : 'User'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ${navigationExpanded ? 'w-64' : 'w-16'}`}>
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 justify-between">
                {navigationExpanded ? (
                  <>
                    <div className="flex items-center">
                      <Lock className="h-8 w-8 text-blue-600" />
                      <span className="ml-2 text-lg font-semibold text-gray-900">SecurePass</span>
                    </div>
                    <button
                      onClick={() => setNavigationExpanded(false)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setNavigationExpanded(true)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
              <nav className="mt-8 flex-1 px-2 bg-white space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center ${navigationExpanded ? 'px-3' : 'justify-center px-2'} py-3 text-sm font-medium rounded-md`}
                    title={navigationExpanded ? undefined : item.name}
                  >
                    <item.icon className={`h-6 w-6 ${navigationExpanded ? 'mr-3' : ''}`} />
                    {navigationExpanded && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className={`flex w-full ${navigationExpanded ? 'items-center' : 'flex-col items-center space-y-3'}`}>
                <div className="flex-shrink-0">
                  {user?.isAdmin ? (
                    <Shield className="h-6 w-6 text-blue-600" />
                  ) : (
                    <User className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                {navigationExpanded && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.isAdmin ? 'Administrator' : 'User'}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
