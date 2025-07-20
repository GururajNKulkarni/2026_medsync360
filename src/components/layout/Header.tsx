import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut,
  Stethoscope,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useResponsive } from '../../hooks/useResponsive';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, isSidebarOpen }) => {
  const { profile, signOut } = useAuthStore();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [signOut]);

  const handleProfileClick = useCallback(() => {
    navigate('/settings');
    setShowUserMenu(false);
  }, [navigate]);

  const handleSettingsClick = useCallback(() => {
    navigate('/settings');
    setShowUserMenu(false);
  }, [navigate]);
  return (
    <motion.header 
      className="bg-white border-b border-neutral-200 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={cn(
        "flex items-center justify-between h-16",
        // Responsive padding
        "px-4 sm:px-6 lg:px-8"
      )}>
        {/* Left side - Logo and Menu */}
        <div className="flex items-center">
          {/* Menu button for tablet */}
          {isTablet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="mr-2 min-h-[44px] min-w-[44px]" // Touch target
            >
              <Menu size={20} />
            </Button>
          )}
          
          <div className="flex items-center">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-primary-600" />
              <span className={cn(
                "ml-2 font-bold text-neutral-900",
                // Responsive text sizing
                "text-lg sm:text-xl"
              )}>
                MedSync<span className="text-primary-600">360</span>
              </span>
            </div>
            <div className="ml-3 flex items-center">
              <Shield className="h-4 w-4 text-success-600" />
              <span className="ml-1 text-xs font-medium text-success-600 hidden sm:inline">
                HIPAA Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Center - Search (Desktop only) */}
        {isDesktop && (
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search patients, referrals, messages..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Right side - Actions and Profile */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Search icon for mobile/tablet */}
          {!isDesktop && (
            <Button 
              variant="ghost" 
              size="sm"
              className="min-h-[44px] min-w-[44px]" // Touch target
            >
              <Search size={20} />
            </Button>
          )}

          {/* Notifications */}

          {/* Profile Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "flex items-center space-x-2 min-h-[44px]", // Touch target
                !isDesktop && "min-w-[44px]" // Minimum width for touch
              )}
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              {isDesktop && (
                <div className="text-left">
                  <div className="text-sm font-medium text-neutral-900">
                    {profile?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {profile?.role} • {profile?.department}
                  </div>
                </div>
              )}
            </Button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50",
                  // Responsive width
                  "w-48 sm:w-56"
                )}
              >
                <button 
                  onClick={handleProfileClick}
                  className={cn(
                  "w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center",
                  "min-h-[44px]" // Touch target
                )}>
                  <User size={16} className="mr-2" />
                  Profile
                </button>
                <button 
                  onClick={handleSettingsClick}
                  className={cn(
                  "w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center",
                  "min-h-[44px]" // Touch target
                )}>
                  <Settings size={16} className="mr-2" />
                  Settings
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50 flex items-center",
                    "min-h-[44px]" // Touch target
                  )}
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default React.memo(Header);