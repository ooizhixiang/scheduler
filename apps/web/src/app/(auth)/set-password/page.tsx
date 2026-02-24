'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordSchema } from '@scheduler/shared-validators';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api-client';
import { AlertTriangle } from 'lucide-react';

const setPasswordFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SetPasswordFormData = z.infer<typeof setPasswordFormSchema>;

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [expired, setExpired] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(true);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordFormSchema),
  });

  useEffect(() => {
    if (!token) {
      setTokenInvalid(true);
      setFetchingInfo(false);
      return;
    }

    apiClient.get('/auth/invite-info', { params: { token } })
      .then((res) => {
        const info = res.data.data || res.data;
        setInviteEmail(info.email);
        if (info.firstName) setValue('firstName', info.firstName);
        if (info.lastName) setValue('lastName', info.lastName);
        if (info.expired) setExpired(true);
      })
      .catch(() => {
        setTokenInvalid(true);
      })
      .finally(() => {
        setFetchingInfo(false);
      });
  }, [token, setValue]);

  const onSubmit = async (data: SetPasswordFormData) => {
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/set-password', {
        token,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      const result = response.data.data || response.data;
      setAuth(result.accessToken, result.employee);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to set password';
      if (msg.includes('expired') || msg.includes('Invalid')) {
        setExpired(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingInfo) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  if (tokenInvalid) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h2 className="text-xl font-bold">Invalid invitation link</h2>
            <p className="text-muted-foreground">
              This invitation link is not valid. Please check the link in your email or contact your administrator for a new invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expired) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-orange-500" />
            <h2 className="text-xl font-bold">Invitation expired</h2>
            <p className="text-muted-foreground">
              This invitation link has expired. Please contact your administrator to resend the invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Create your account</CardTitle>
        <CardDescription className="text-center">
          Complete your profile to activate your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={inviteEmail} disabled className="bg-muted" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting up...' : 'Activate account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
