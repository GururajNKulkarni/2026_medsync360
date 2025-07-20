import React, { useEffect } from 'react';

// When this component mounts, simply redirect the browser to the static
// HTML presentation that lives in /public/medsync360_final.html. This avoids
// brittle DOM-replacement logic and works both in dev (vite) and production
// builds.

export const MedSyncVideo: React.FC = () => {
  useEffect(() => {
    window.location.replace('/medsync360_final.html');
  }, []);

  // Render nothing while the redirect happens
  return null;
};

export default MedSyncVideo;