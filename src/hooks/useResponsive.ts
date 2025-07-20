import { useState, useEffect } from 'react';

export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1600,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAbove = (breakpoint: Breakpoint) => windowSize.width >= breakpoints[breakpoint];
  const isBelow = (breakpoint: Breakpoint) => windowSize.width < breakpoints[breakpoint];
  const isBetween = (min: Breakpoint, max: Breakpoint) => 
    windowSize.width >= breakpoints[min] && windowSize.width < breakpoints[max];

  return {
    windowSize,
    isAbove,
    isBelow,
    isBetween,
    isMobile: isBelow('md'),
    isTablet: isBetween('md', 'lg'),
    isDesktop: isAbove('lg'),
    isSmallMobile: isBelow('sm'),
    isLargeMobile: isBetween('sm', 'md'),
  };
};

export const useBreakpoint = () => {
  const { windowSize } = useResponsive();
  
  const getCurrentBreakpoint = (): Breakpoint => {
    const width = windowSize.width;
    if (width >= breakpoints['3xl']) return '3xl';
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    if (width >= breakpoints.xs) return 'xs';
    return 'xs';
  };

  return getCurrentBreakpoint();
};