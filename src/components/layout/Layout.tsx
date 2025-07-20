import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useResponsive } from '../../hooks/useResponsive';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop/Tablet Header */}
      {!isMobile && <Header onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />}
      
      <div className="flex">
        {/* Sidebar for desktop/tablet */}
        {showSidebar && (isDesktop || isTablet) && (
          <Sidebar 
            isOpen={isDesktop || sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            className={cn(
              "transition-all duration-300",
              isTablet ? "w-16" : "w-64"
            )}
          />
        )}
        
        {/* Main content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          // Desktop spacing
          showSidebar && isDesktop && "ml-64",
          // Tablet spacing
          showSidebar && isTablet && "ml-16",
          // Mobile spacing for bottom nav
          isMobile && "pb-16"
        )}>
          <div className={cn(
            // Enhanced mobile-first responsive padding
            "px-4 py-4 max-w-full",
            // Tablet enhancements - more generous spacing
            "md:px-8 md:py-6 md:max-w-none",
            // Desktop enhancements - optimal spacing
            "lg:px-12 lg:py-8 lg:max-w-7xl lg:mx-auto",
            // Extra large screens
            "xl:px-16 xl:py-10"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && <MobileNav />}

      {/* AI Assistant Floating Button - Only show on non-dashboard pages */}
      
    </div>
  );
};