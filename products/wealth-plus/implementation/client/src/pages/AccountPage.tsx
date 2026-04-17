import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useUpdateProfile } from '../hooks/useSettings';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import type { UpdateProfileFormValues, ChangePasswordFormValues } from '../types/index';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function AccountPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const { toast } = useToast();

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({ name: profile.name });
    }
  }, [profile, profileForm]);

  const onProfileSubmit = (values: UpdateProfileFormValues) => {
    updateProfileMutation.mutate(
      { name: values.name },
      {
        onSuccess: () => toast.success('Profile updated successfully.'),
        onError: () => toast.error('Failed to update profile. Please try again.'),
      }
    );
  };

  const onPasswordSubmit = (values: ChangePasswordFormValues) => {
    updateProfileMutation.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success('Password changed successfully.');
          passwordForm.reset();
        },
        onError: () => toast.error('Failed to change password. Check your current password.'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Account</h1>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            noValidate
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <Input
                {...profileForm.register('name')}
                className={profileForm.formState.errors.name ? 'border-red-400' : ''}
              />
              {profileForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={profile?.email ?? ''}
                readOnly
                disabled
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving…' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            noValidate
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('currentPassword')}
                className={passwordForm.formState.errors.currentPassword ? 'border-red-400' : ''}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
              <Input
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('newPassword')}
                className={passwordForm.formState.errors.newPassword ? 'border-red-400' : ''}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('confirmPassword')}
                className={passwordForm.formState.errors.confirmPassword ? 'border-red-400' : ''}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Changing…' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
