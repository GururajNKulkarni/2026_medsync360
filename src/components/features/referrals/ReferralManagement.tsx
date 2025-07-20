import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Filter,
  Zap,
  ChevronLeft,
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Archive,
  ChevronRight,
  AlertTriangle,
  Calendar,
  User,
  Building2
} from 'lucide-react';
import { useResponsive } from '../../../hooks/useResponsive';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { ReferralForm } from './ReferralForm';
import { ReferralCard } from './ReferralCard';
import { ReferralTabs } from './ReferralTabs';
import { ReferralDetails } from './ReferralDetails';
import { cn } from '../../../lib/utils';
import { useReferrals, useCreateReferral, useUpdateReferralStatus } from '../../../hooks/useReferrals';
import { mapStatusForDisplay } from '../../../types/referral.types';
import { useAuthStore } from '../../../store/authStore';
import { useEffect } from 'react';
import type { Referral, ReferralStatus, UrgencyLevel } from '../../../types/referral.types';

interface ReferralData {
  id: string;
}

const ReferralManagement: React.FC = () => {
  const { isMobile } = useResponsive();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ReferralStatus | 'Archive'>('Received');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  // React Query hooks
  const { data: referrals = [], isLoading, error, refetch } = useReferrals();
  const createReferralMutation = useCreateReferral();
  const updateStatusMutation = useUpdateReferralStatus();

  // Refetch on mount to ensure we have the latest data
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Filter referrals based on active tab and search query
  const filteredReferrals = useMemo(() => referrals.filter(referral => {
    const matchesTab = referral.status === activeTab;
    
    // Special case for Archive tab
    if (activeTab === 'Archive') {
      return true; // Show all referrals in archive view
    }
    
    // Special handling for 'Accepted' tab which should show 'Acknowledged' referrals
    const matchesAcceptedTab = activeTab === 'Accepted' && referral.status === 'Acknowledged';
    
    // Special handling for 'Closed' tab - show both explicit Closed status and Acknowledged with end_time
    const matchesClosedTab = activeTab === 'Closed' && 
      (referral.status === 'Closed' || (referral.status === 'Acknowledged' && referral.end_time));
    
    const matchesSearch = searchQuery === '' || 
      referral.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.doctor.toLowerCase().includes(searchQuery.toLowerCase());
    
    return (matchesTab || matchesAcceptedTab || matchesClosedTab) && matchesSearch;
  }), [referrals, activeTab, searchQuery]);

  // Separate referrals into top 10 and archive
  const [topReferrals, archiveReferrals] = useMemo(() => { 
    if (activeTab === 'Archive') {
      return [[], filteredReferrals];
    }
    
    // Sort by creation date (newest first)
    const sorted = [...filteredReferrals].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Split into top 10 and archive
    const top = sorted.slice(0, 10);
    const archive = sorted.slice(10);
    
    return [top, archive];
  }, [filteredReferrals, activeTab]);

  // Get counts for each tab
  const tabCounts = useMemo(() => {
    const counts: Record<ReferralStatus, number> = {
      'Received': 0,
      'Accepted': 0,
      'Sent': 0,
      'Cancelled': 0,
      'Closed': 0
    };
    
    let archiveCount = 0;
    
    referrals.forEach(referral => {
      // Handle special cases for status counting
      if (referral.status === 'Acknowledged') { 
        // Count 'Acknowledged' as 'Accepted' for UI
        counts['Accepted']++;
      } else if (referral.status === 'Closed' || (referral.status === 'Acknowledged' && referral.end_time)) {
        counts['Closed']++;
      } else {
        counts[referral.status]++;
      }
      
      // Count referrals that would be in archive (more than top 10)
      if (referral.status === activeTab && archiveCount >= 10) {
        archiveCount++;
      }
    });
    
    return { ...counts, Archive: archiveCount };
  }, [referrals]);
  
  // Debug referral counts
  useEffect(() => {
    console.log('Referral counts by status:', tabCounts);
  }, [tabCounts]);

  const handleCreateReferral = useCallback((newReferral: Omit<Referral, 'id' | 'createdAt' | 'status'> & { toDoctorId?: string }) => {
    const referralData = {
      ...newReferral,
      fromUserId: profile?.id,
      toUserId: newReferral.toDoctorId || null, // Use the selected doctor's ID
    };
    
    createReferralMutation.mutate(referralData, {
      onSuccess: () => {
        setShowCreateModal(false);
        setActiveTab('Sent');
      }
    });
  }, [profile?.id, createReferralMutation]);

  const handleStatusChange = useCallback((referralId: string, newStatus: ReferralStatus) => {
    console.log(`Changing referral ${referralId} status to ${newStatus}`);
    updateStatusMutation.mutate({ id: referralId, status: newStatus });
  }, [updateStatusMutation]);

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Error Loading Referrals</h2>
        <p className="text-neutral-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Medical Referrals</h1>
          <p className="text-neutral-600 mt-1">Manage patient referrals across departments</p>
            {activeTab !== 'Archive' && archiveReferrals.length > 0 && (
              <div className="mt-2">
                <button 
                  onClick={() => setActiveTab('Archive')}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" /> View {archiveReferrals.length} archived referrals
                </button>
              </div>
            )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
          >
            <Filter size={16} className="mr-2" />
            Filter
          </Button>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus size={16} className="mr-2" />
            New Referral
          </Button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by patient name, department, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ReferralTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={tabCounts}
        />
        
        {/* Archive Banner - Show when viewing archive */}
        {activeTab === 'Archive' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">Archive View</h3>
                <p className="text-sm text-blue-700">Showing {archiveReferrals.length} older referrals</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('Received')}
            >
              <ChevronLeft size={16} className="mr-1" /> Back to Recent
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Referrals List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-32 bg-neutral-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredReferrals.length === 0 ? (
              <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card padding="xl" className="text-center">
                <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  No referrals found
                </h3>
                <p className="text-neutral-600">
                  {searchQuery 
                    ? `No referrals match "${searchQuery}" in ${activeTab.toLowerCase()} status.`
                    : `No ${activeTab.toLowerCase()} referrals at the moment.`
                  }
                </p>
                {activeTab === 'Sent' && !searchQuery && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4"
                  >
                    <Plus size={16} className="mr-2" />
                    Create First Referral
                  </Button>
                )}
              </Card>
            </motion.div>
          ) : (
              <div>
                {activeTab === 'Archive' ? (
                  <motion.div
                    key="archive-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {archiveReferrals.map((referral, index) => (
                      <motion.div
                        key={referral.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ReferralCard
                          referral={referral}
                          onStatusChange={handleStatusChange}
                          onClick={() => setSelectedReferral(referral)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div>
                    {/* Top 10 Referrals Section */}
                    <motion.div
                      key="top-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {topReferrals.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-blue-600" />
                              Recent Referrals
                            </h2>
                            <div className="text-sm text-gray-500">
                              Showing {topReferrals.length} most recent
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {topReferrals.map((referral, index) => (
                              <motion.div
                                key={referral.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <ReferralCard
                                  referral={referral}
                                  onStatusChange={handleStatusChange}
                                  onClick={() => setSelectedReferral(referral)}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Archive Link - Only show if there are archived referrals */}
                      {archiveReferrals.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: topReferrals.length * 0.05 + 0.1 }}
                        >
                          <Card 
                            padding="lg" 
                            className="bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100 cursor-pointer"
                            onClick={() => setActiveTab('Archive')}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <Archive className="w-5 h-5 text-gray-500" />
                              <span className="font-medium text-gray-700">
                                View {archiveReferrals.length} more referrals in archive
                              </span>
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
          )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Create Referral Modal */}
      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Referral"
        size="lg"
      >
        <ReferralForm
          onSubmit={handleCreateReferral}
          onCancel={() => setShowCreateModal(false)}
        />
      </ResponsiveModal>

      {/* Referral Details Modal */}
      <ResponsiveModal
        isOpen={!!selectedReferral}
        onClose={() => setSelectedReferral(null)}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Referral Details</span>
          </div>
        }
        size="lg"
      >
        {selectedReferral && (
          <ReferralDetails 
            referral={selectedReferral}
            onStatusChange={handleStatusChange}
            onClose={() => setSelectedReferral(null)}
          />
        )}
      </ResponsiveModal>
    </div>
  );
};

export { ReferralManagement };