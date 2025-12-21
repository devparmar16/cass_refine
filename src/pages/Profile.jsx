import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Shield, Edit, Save, X, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const Profile = () => {
  const { user, isLoading: authLoading, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    contact_num: '',
    disp_name: ''
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true); // Always show skeleton on mount/navigation
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoading(false); // Hide skeleton when user data is ready
    }
  }, [user, authLoading]);

  // Memoized role color and display
  const roleColor = useMemo(() => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      chair_person: 'bg-purple-100 text-purple-800',
      vice_chair_person: 'bg-blue-100 text-blue-800',
      secretary: 'bg-green-100 text-green-800',
      treasurer: 'bg-yellow-100 text-yellow-800',
      technical_coordinator: 'bg-indigo-100 text-indigo-800',
      event_coordinator: 'bg-pink-100 text-pink-800',
      social_media_promotion: 'bg-orange-100 text-orange-800'
    };
    return colors[user?.role?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }, [user?.role]);

  const formattedRole = useMemo(() => {
    return user?.role?.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') || 'User';
  }, [user?.role]);

  // Optimized input change handler
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Password form change handler
  const handlePasswordChange = useCallback((field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Change password function
  const handleChangePassword = useCallback(async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive"
      });
      return;
    }

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      
      const response = await fetch('http://localhost:5001/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          newPassword: passwordForm.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully changed.",
        });
        setShowPasswordChange(false);
        setPasswordForm({
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to change password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  }, [user?.email, passwordForm, toast]);

  // Optimized save handler
  const handleSave = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
        await updateProfile(formData);
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } catch (error) {
      console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
    } finally {
      setIsSaving(false);
    }
  }, [user, formData, updateProfile, toast]);

  // Handle avatar click to trigger file picker
  const handleAvatarClick = useCallback(() => {
    if (fileInputRef.current && !isUploadingAvatar) {
      fileInputRef.current.click();
    }
  }, [isUploadingAvatar]);

  // Handle selected file upload to Supabase Storage
  const handleAvatarChange = useCallback(async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !user?.username) return;

    const isImage = file.type.startsWith('image/');
    const maxSizeBytes = 3 * 1024 * 1024; // 3MB
    if (!isImage) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > maxSizeBytes) {
      toast({ title: 'File too large', description: 'Max size is 3MB.', variant: 'destructive' });
      return;
    }
    // Show preview dialog first
    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  }, [toast, updateProfile, user?.username]);

  const handleCancelUpload = useCallback(() => {
    setIsPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const handleConfirmUpload = useCallback(async () => {
    if (!previewFile || !user?.username) return;
    // Close the dialog immediately to avoid it reopening while uploading
    setIsPreviewOpen(false);
    try {
      setIsUploadingAvatar(true);
      const file = previewFile;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const path = `profile_pic/${user.username}-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profile')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('profile').getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || '';

      await updateProfile({ profile_img: publicUrl });

      toast({ title: 'Profile picture updated', description: 'Your avatar has been saved.' });
    } catch (err) {
      console.error('Avatar upload error:', err);
      const message = err?.message || 'Could not upload image. Try again.';
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setPreviewFile(null);
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [previewFile, previewUrl, updateProfile, toast, user?.username]);

  // Optimized cancel handler
  const handleCancel = useCallback(() => {
    if (user) {
      setFormData({
        username: user.username ?? '',
        email: user.email ?? '',
        contact_num: user.contact_num ?? '',
        disp_name: user.disp_name ?? ''
      });
    }
    setIsEditing(false);
  }, [user]);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username ?? '',
        email: user.email ?? '',
        contact_num: user.contact_num ?? '',
        disp_name: user.disp_name ?? ''
      });
    }
  }, [user]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Profile Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="flex items-center space-x-6 mb-8">
          {/* Avatar */}
          <div className="h-24 w-24 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Permissions Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  );

  if (authLoading || isLoading) {
    return (
      <div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Please log in to view your profile</p>
          <Button 
            onClick={() => window.location.href = '/login'} 
            className="mt-4"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                Profile Information
              </CardTitle>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                <Avatar onClick={handleAvatarClick} className="h-24 w-24 cursor-pointer">
                  <AvatarImage src={user?.profile_img || ''} alt={user.disp_name ?? 'User'} />
                  <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    ) : (
                      user?.disp_name?.charAt(0) ?? 'U'
                    )}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{user.disp_name ?? 'Unnamed User'}</h3>
                <Badge className={`mt-2 ${roleColor}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {formattedRole}
                </Badge>
                <p className="text-sm text-gray-500 mt-2">Member since January 2024</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  {isEditing ? (
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">{user.username}</div>
                  )}
                </div>

                <div>
                  <Label htmlFor="disp_name" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Display Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="disp_name"
                      value={formData.disp_name}
                      onChange={(e) => handleInputChange('disp_name', e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">{user.disp_name}</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">{user.email}</div>
                  )}
                </div>

                <div>
                  <Label htmlFor="contact_num" className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    Mobile
                  </Label>
                  {isEditing ? (
                    <Input
                      id="contact_num"
                      value={formData.contact_num}
                      onChange={(e) => handleInputChange('contact_num', e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">{user.contact_num}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Role & Permissions
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Current Role: {formattedRole}</h4>
              <p className="text-sm text-blue-700">
                {user.role === 'chair_person' && "You have full administrative access including event creation, final approvals, and task management."}
                {user.role === 'vice_chair_person' && "You can upload participant data, review documents, and manage event proposals."}
                {user.role === 'secretary' && "You handle event documentation, proposals, and have review rights for multiple tasks."}
                {user.role === 'treasurer' && "You manage budgets, expenses, and financial documentation for events."}
                {user.role === 'technical_coordinator' && "You handle technical support teams and equipment inventory."}
                {user.role === 'event_coordinator' && "You manage volunteers, anchoring teams, and event schedules."}
                {user.role === 'social_media_promotion' && "You handle social media content, promotion, and media coverage."}
                {user.role === 'admin' && "You have system-wide administrative privileges and user management capabilities."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-600" />
              Change Password
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {!showPasswordChange ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Change your account password. Since you're already logged in, you only need to enter your new password.
                </p>
                <Button 
                  onClick={() => setShowPasswordChange(true)}
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" />
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="flex items-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordForm({
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Avatar preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={(o) => { if (!o) handleCancelUpload(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview profile picture</DialogTitle>
            <DialogDescription>Confirm to save this image as your avatar.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="max-h-64 rounded-full object-cover aspect-square" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUpload} disabled={isUploadingAvatar}>Cancel</Button>
            <Button onClick={handleConfirmUpload} disabled={isUploadingAvatar} className="flex items-center gap-2">
              {isUploadingAvatar && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
