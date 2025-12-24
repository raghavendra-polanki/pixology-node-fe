import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, X, Users, Copy, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface Member extends User {
  role: 'owner' | 'editor' | 'viewer';
  isOwner: boolean;
}

interface ShareProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  isOwner: boolean;
  productType: 'storylab' | 'flarelab';
  onDuplicate?: () => void;
}

export const ShareProjectDialog = ({
  open,
  onClose,
  projectId,
  projectTitle,
  isOwner,
  productType,
  onDuplicate,
}: ShareProjectDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ userId: string; role: 'editor' | 'viewer' }[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiBase = productType === 'storylab' ? '/api/storylab/projects' : '/api/flarelab/projects';

  // Fetch current members when dialog opens
  useEffect(() => {
    if (open && projectId) {
      fetchMembers();
    }
  }, [open, projectId]);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${apiBase}/${projectId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Debounced search
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out users who are already members
        const memberIds = new Set(members.map((m) => m.userId));
        const filteredResults = data.users.filter((u: User) => !memberIds.has(u.id));
        setSearchResults(filteredResults);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  }, [members]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  const addUserToSelection = (user: User, role: 'editor' | 'viewer' = 'viewer') => {
    if (!selectedUsers.find((u) => u.userId === user.id)) {
      setSelectedUsers([...selectedUsers, { userId: user.id, role }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromSelection = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.userId !== userId));
  };

  const updateSelectedRole = (userId: string, role: 'editor' | 'viewer') => {
    setSelectedUsers(selectedUsers.map((u) => (u.userId === userId ? { ...u, role } : u)));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    setIsSharing(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${apiBase}/${projectId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ users: selectedUsers }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(`Shared with ${data.addedUsers?.length || 0} user(s)`);
        setSelectedUsers([]);
        await fetchMembers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to share project');
      }
    } catch (err) {
      setError('Failed to share project. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: 'editor' | 'viewer') => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${apiBase}/${projectId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        await fetchMembers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update member role');
      }
    } catch (err) {
      setError('Failed to update member role. Please try again.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${apiBase}/${projectId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchMembers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove member');
      }
    } catch (err) {
      setError('Failed to remove member. Please try again.');
    }
  };

  const getUserDisplayName = (userId: string): string => {
    const user = searchResults.find((u) => u.id === userId);
    return user?.name || user?.email || userId;
  };

  const accentColor = productType === 'storylab' ? 'blue' : 'orange';
  const accentClasses = {
    button: productType === 'storylab' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600',
    ring: productType === 'storylab' ? 'focus:ring-blue-500' : 'focus:ring-orange-500',
    text: productType === 'storylab' ? 'text-blue-400' : 'text-orange-400',
    border: productType === 'storylab' ? 'border-blue-500' : 'border-orange-500',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? `Share "${projectTitle}" with other Pixology users`
              : `Duplicate "${projectTitle}" to become the owner and share it`}
          </DialogDescription>
        </DialogHeader>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm p-3 rounded-md flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {isOwner ? (
          <>
            {/* Search Users */}
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Add people</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className={`pl-9 bg-gray-800/50 border-gray-700 text-white ${accentClasses.ring}`}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-md max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addUserToSelection(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/50 transition-colors text-left"
                    >
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm text-white">
                          {user.name?.[0] || user.email?.[0] || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <UserPlus className={`w-4 h-4 ${accentClasses.text}`} />
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className="text-sm text-gray-500 text-center py-2">No users found</p>
              )}
            </div>

            {/* Selected Users to Add */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Users to add</label>
                <div className="space-y-2">
                  {selectedUsers.map((selected) => (
                    <div
                      key={selected.userId}
                      className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-md"
                    >
                      <span className="flex-1 text-sm text-white truncate">
                        {getUserDisplayName(selected.userId)}
                      </span>
                      <select
                        value={selected.role}
                        onChange={(e) =>
                          updateSelectedRole(selected.userId, e.target.value as 'editor' | 'viewer')
                        }
                        className={`text-xs bg-gray-700 border-none rounded px-2 py-1 text-white ${accentClasses.ring}`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => removeFromSelection(selected.userId)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleShare}
                  disabled={isSharing}
                  className={`w-full ${accentClasses.button} text-white`}
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Share with {selectedUsers.length} user(s)
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Current Members */}
            <div className="space-y-2 pt-4 border-t border-gray-700">
              <label className="block text-sm text-gray-400">People with access</label>
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/30"
                    >
                      {member.picture ? (
                        <img src={member.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm text-white">
                          {member.name?.[0] || member.email?.[0] || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{member.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      </div>
                      {member.isOwner ? (
                        <span className={`text-xs ${accentClasses.text} font-medium`}>Owner</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateMemberRole(member.userId, e.target.value as 'editor' | 'viewer')
                            }
                            className={`text-xs bg-gray-700 border-none rounded px-2 py-1 text-white ${accentClasses.ring}`}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400"
                            title="Remove member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Non-owner: Show duplicate option */
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-400">
              You don't have permission to share this project directly. Duplicate it to create your own copy
              that you can then share with others.
            </p>
            <Button
              onClick={() => {
                onDuplicate?.();
                onClose();
              }}
              className={`w-full ${accentClasses.button} text-white`}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Project
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
