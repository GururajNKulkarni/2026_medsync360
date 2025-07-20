import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Building2, CreditCard, Check, Sparkles, Shield } from 'lucide-react';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { Button } from '../../ui/Button';
import { useDoctors } from '../../../hooks/useChat';
import { cn } from '../../../lib/utils';
import type { Doctor } from '../../../types/chat.types';

interface DoctorSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoctor: (doctor: Doctor) => void;
}

export const DoctorSearch: React.FC<DoctorSearchProps> = ({
  isOpen,
  onClose,
  onSelectDoctor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  const { data: doctors = [], isLoading } = useDoctors();

  // Filter doctors based on search and department
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = searchQuery === '' || 
      doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doctor.kmc_number && doctor.kmc_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === '' || doctor.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments for filter
  const departments = [...new Set(doctors.map(doctor => doctor.department))].sort();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedDepartment('');
      setSelectedDoctor(null);
    }
  }, [isOpen]);

  const handleStartConversation = () => {
    if (selectedDoctor) {
      onSelectDoctor(selectedDoctor);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen} 
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>Start New Conversation</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" 
              placeholder="Search by name or KMC number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
            />
          </div>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm transition-all duration-300"
          >
            <option value="">All Departments</option>
            {departments.map(department => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </div>

        {/* Doctor List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse p-4 border border-gray-200 rounded-lg mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-200 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-blue-100 rounded-full w-3/4" />
                      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDoctors.map((doctor) => (
                <motion.button
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                    selectedDoctor?.id === doctor.id
                      ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50"
                      : "border-gray-200 hover:border-blue-300 bg-white"
                  )}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-md">
                      {doctor.avatar_url ? (
                        <img
                          src={doctor.avatar_url}
                          alt={doctor.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {doctor.full_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doctor.full_name}
                        </h4> 
                        {selectedDoctor?.id === doctor.id && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-1 space-x-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <Building2 className="w-3 h-3 mr-1" />
                          <span className="truncate">{doctor.department}</span>
                        </div>
                        
                        {doctor.kmc_number && (
                          <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            <CreditCard className="w-3 h-3 mr-1" />
                            <span className="font-mono">{doctor.kmc_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={handleStartConversation}
            disabled={!selectedDoctor}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Secure Chat
          </Button>
        </div>
        
        {/* Security note */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center text-xs text-gray-500">
          <Shield className="w-3 h-3 mr-1 text-green-600" />
          <span>All conversations are end-to-end encrypted and HIPAA compliant</span>
        </div>
      </div>
    </ResponsiveModal>
  );
};