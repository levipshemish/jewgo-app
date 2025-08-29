'use client';

import React, { useState, useEffect, useRef } from 'react';
import { appLogger } from '@/lib/utils/logger';

interface MessagingCenterProps {
  storeData: any;
  onRefresh: () => void;
}

interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  recipient_id: string;
  recipient_name: string;
  subject: string;
  message_text: string;
  is_read: boolean;
  is_archived: boolean;
  message_type: string; // inquiry, order, general, kosher
  priority: string; // low, medium, high, urgent
  created_at: string;
  updated_at: string;
  related_order_id?: string;
  related_product_id?: string;
  kosher_related: boolean;
  kosher_topic?: string;
}

interface Conversation {
  conversation_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  message_count: number;
  is_archived: boolean;
  priority: string;
  subject: string;
  created_at: string;
}

export default function MessagingCenter({ storeData, onRefresh }: MessagingCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [storeData.store_id, filterType, filterPriority, showArchived]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.conversation_id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        type: filterType === 'all' ? '' : filterType,
        priority: filterPriority === 'all' ? '' : filterPriority,
        archived: showArchived.toString()
      });
      
      const response = await fetch(`/api/shtel/store/${storeData.store_id}/conversations?${params}`);
      if (!response.ok) {throw new Error('Failed to load conversations');}
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      appLogger.error('Error loading conversations:', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/shtel/store/${storeData.store_id}/conversations/${conversationId}/messages`);
      if (!response.ok) {throw new Error('Failed to load messages');}
      
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
    } catch (err) {
      appLogger.error('Error loading messages:', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/shtel/store/${storeData.store_id}/conversations/${conversationId}/read`, {
        method: 'PUT'
      });
      
      // Update conversation unread count
      setConversations(prev => prev.map(conv => 
        conv.conversation_id === conversationId 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
      
      onRefresh();
    } catch (err) {
      appLogger.error('Error marking messages as read:', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) {return;}
    
    try {
      setSending(true);
      
      const response = await fetch(`/api/shtel/store/${storeData.store_id}/conversations/${selectedConversation.conversation_id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: newMessage,
          message_type: 'general'
        }),
      });

      if (!response.ok) {throw new Error('Failed to send message');}
      
      const data = await response.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
      
      // Update conversation last message
      setConversations(prev => prev.map(conv => 
        conv.conversation_id === selectedConversation.conversation_id
          ? { 
              ...conv, 
              last_message: newMessage,
              last_message_time: new Date().toISOString(),
              message_count: conv.message_count + 1
            }
          : conv
      ));
      
    } catch (err) {
      appLogger.error('Error sending message:', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSending(false);
    }
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/shtel/store/${storeData.store_id}/conversations/${conversationId}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: !showArchived }),
      });

      if (!response.ok) {throw new Error('Failed to archive conversation');}
      
      await loadConversations();
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      appLogger.error('Error archiving conversation:', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'inquiry': return '❓';
      case 'order': return '🛒';
      case 'kosher': return '✡️';
      case 'general': return '💬';
      default: return '💬';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = 
      conversation.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messaging Center</h2>
          <p className="text-gray-600">Communicate with your customers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="inquiry">Inquiries</option>
              <option value="order">Orders</option>
              <option value="kosher">Kosher</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
            <p className="text-sm text-gray-600">{filteredConversations.length} conversations</p>
          </div>
          
          <div className="overflow-y-auto h-[500px]">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.conversation_id === conversation.conversation_id
                      ? 'bg-blue-50 border-blue-200'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(conversation.subject.split(' ')[0])}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{conversation.customer_name}</p>
                        <p className="text-sm text-gray-600 truncate">{conversation.subject}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(conversation.priority)}`}>
                        {conversation.priority}
                      </span>
                      {conversation.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 truncate mb-2">{conversation.last_message}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(conversation.last_message_time)}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveConversation(conversation.conversation_id);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {conversation.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-500 text-4xl mb-2">💬</div>
                <p className="text-gray-600">No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedConversation.customer_name}</h3>
                    <p className="text-sm text-gray-600">{selectedConversation.customer_email}</p>
                    <p className="text-sm text-gray-600">{selectedConversation.subject}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedConversation.priority)}`}>
                      {selectedConversation.priority}
                    </span>
                    <button
                      onClick={() => archiveConversation(selectedConversation.conversation_id)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {selectedConversation.is_archived ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto h-[400px] p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_id === storeData.owner_user_id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === storeData.owner_user_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {message.sender_id === storeData.owner_user_id ? 'You' : message.sender_name}
                        </span>
                        <span className="text-xs opacity-75">{formatDate(message.created_at)}</span>
                      </div>
                      <p className="text-sm">{message.message_text}</p>
                      {message.kosher_related && (
                        <div className="mt-2 text-xs opacity-75">
                          ✡️ Kosher-related inquiry
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-6xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Conversation</h3>
                <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredConversations.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Found</h3>
          <p className="text-gray-600">
            {conversations.length === 0 
              ? "You haven't received any messages yet. They'll appear here when customers contact you."
              : "No conversations match your current filters."
            }
          </p>
        </div>
      )}
    </div>
  );
}
