import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Edit3, 
  Download, 
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';

interface Conversation {
  id: string;
  patientName: string;
  patientId: string;
  visitDate: string;
  dateOfBirth: string;
  duration: string;
  confidence: number;
  status: 'completed' | 'needs_review' | 'draft';
  summary: {
    chiefComplaint: string;
    assessment: string;
    plan: string;
  };
  lastModified: string;
}

interface ConversationHistoryProps {
  onEditConversation: (id: string) => void;
}

// Mock data - would come from API
const mockConversations: Conversation[] = [
  {
    id: 'P001',
    patientName: 'John Doe',
    patientId: 'P001',
    visitDate: '2025-01-23',
    dateOfBirth: '1975-05-15',
    duration: '7:00',
    confidence: 85,
    status: 'completed',
    summary: {
      chiefComplaint: 'Chest pain and shortness of breath',
      assessment: 'Possible hypertensive episode',
      plan: 'Start ACE inhibitor, follow up in 2 weeks'
    },
    lastModified: '2025-01-23T12:52:03'
  },
  {
    id: 'P002',
    patientName: 'Jane Smith',
    patientId: 'P002',
    visitDate: '2025-01-21',
    dateOfBirth: '1988-12-03',
    duration: '5:15',
    confidence: 92,
    status: 'completed',
    summary: {
      chiefComplaint: 'Abdominal pain with nausea and vomiting',
      assessment: 'Rule out appendicitis',
      plan: 'CBC, CMP, CT abdomen, surgical consultation'
    },
    lastModified: '2025-01-21T15:52:03'
  },
  {
    id: 'P003',
    patientName: 'Robert Johnson',
    patientId: 'P003',
    visitDate: '2025-01-20',
    dateOfBirth: '1962-08-20',
    duration: '3:00',
    confidence: 65,
    status: 'needs_review',
    summary: {
      chiefComplaint: 'Diabetes follow-up',
      assessment: 'Diabetes well controlled',
      plan: 'Continue current medications'
    },
    lastModified: '2025-01-20T14:52:03'
  }
];

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onEditConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'needs_review' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence'>('newest');

  const filteredConversations = mockConversations
    .filter(conv => {
      const matchesSearch = searchQuery === '' || 
        conv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.summary.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case 'confidence':
          return b.confidence - a.confidence;
        default: // newest
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'needs_review':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name, ID, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Conversations</option>
            <option value="completed">Completed</option>
            <option value="needs_review">Needs Review</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="confidence">Highest Confidence</option>
          </select>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{filteredConversations.length} conversations found</span>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No conversations match "${searchQuery}"`
                : "Start recording conversations to see them here"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  padding="lg" 
                  hoverable 
                  className="cursor-pointer"
                  onClick={() => onEditConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {conversation.patientName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          ID: {conversation.patientId}
                        </span>
                        <span className="text-sm text-gray-500">
                          DOB: {formatDate(conversation.dateOfBirth)}
                        </span>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                          getStatusColor(conversation.status)
                        )}>
                          {getStatusIcon(conversation.status)}
                          {conversation.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Visit Info */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Visit: {formatDate(conversation.visitDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>Duration: {conversation.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Modified: {formatTime(conversation.lastModified)}</span>
                        </div>
                      </div>

                      {/* Medical Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Chief Complaint
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {conversation.summary.chiefComplaint}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Assessment
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {conversation.summary.assessment}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Plan
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {conversation.summary.plan}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Confidence */}
                    <div className="flex flex-col items-end gap-3">
                      <div className={cn(
                        "text-2xl font-bold",
                        getConfidenceColor(conversation.confidence)
                      )}>
                        {conversation.confidence}%
                      </div>
                      <span className="text-xs text-gray-500">confidence</span>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditConversation(conversation.id);
                          }}
                        >
                          <Edit3 size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle export
                          }}
                        >
                          <Download size={14} className="mr-1" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle delete
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredConversations.length} conversations • 
            AI Processing active • 
            Edit functionality enabled
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              AI Processing active
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              Edit functionality enabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};