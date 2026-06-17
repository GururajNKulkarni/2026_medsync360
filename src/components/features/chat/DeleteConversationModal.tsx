import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { Button } from '../../ui/Button';
import type { Conversation } from '../../../types/chat.types';

interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DeleteConversationModal: React.FC<DeleteConversationModalProps> = ({
  isOpen,
  onClose,
  conversation,
  onConfirm,
  isLoading
}) => {
  if (!conversation) return null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Conversation"
      size="sm"
    >
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Conversation?
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Are you sure you want to delete your conversation with{' '}
            <span className="font-medium text-gray-900">
              {conversation.otherParticipant?.full_name || 'Unknown User'}
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Conversation Preview */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {conversation.otherParticipant?.avatar_url ? (
                <img
                  src={conversation.otherParticipant.avatar_url}
                  alt={conversation.otherParticipant.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {conversation.otherParticipant?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {conversation.otherParticipant?.full_name || 'Unknown User'}
              </h4>
              <p className="text-xs text-gray-500">
                {conversation.otherParticipant?.role} • {conversation.otherParticipant?.department}
              </p>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> This will permanently delete all messages in this conversation. 
            The other participant will no longer see this conversation in their list.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Deleting...
              </div>
            ) : (
              <div className="flex items-center">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Conversation
              </div>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}; 