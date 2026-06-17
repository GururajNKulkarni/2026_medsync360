import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Lock, Shield } from 'lucide-react';
import { ChatModal } from './chat/ChatModal';


export const Messages: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(true);
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center">
              <MessageSquare className="w-8 h-8 mr-3" />
              Private Chat
            </h1>
            <p className="text-blue-100 mt-2">
              End-to-end encrypted communication with colleagues
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Private Chat Center
          </h2>
          
          <p className="text-gray-600 mb-8">
            Connect with colleagues through our HIPAA-compliant messaging system. 
            All communications are end-to-end encrypted for maximum security and privacy.
          </p>
          
          <div className="flex justify-center mb-8">
            <button 
              onClick={() => setIsChatOpen(true)} 
              className="w-16 h-16 relative p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Private & Encrypted</h3>
              </div>
              <p className="text-sm text-gray-600">
                All messages are encrypted on your device and can only be decrypted by the intended recipient.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">HIPAA Compliant</h3>
              </div>
              <p className="text-sm text-gray-600">
                Our messaging system meets all HIPAA requirements for secure healthcare communications.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Colleague Directory</h3>
              </div>
              <p className="text-sm text-gray-600">
                Easily find and connect with colleagues across all departments and specialties.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat modal */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default React.memo(Messages);