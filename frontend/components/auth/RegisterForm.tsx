'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/ui/Logo';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : 
              formData.firstName || formData.lastName || undefined,
      });
      router.push('/eatery'); // Redirect to main eatery page after registration
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Join JewGo today</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                  <Input id="email" name="email" type="email" autoComplete="email" required placeholder="Email address" value={formData.email} onChange={handleChange} />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username (optional)</label>
                  <Input id="username" name="username" type="text" autoComplete="username" placeholder="Username" value={formData.username} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name (optional)</label>
                    <Input id="firstName" name="firstName" type="text" autoComplete="given-name" placeholder="First name" value={formData.firstName} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name (optional)</label>
                    <Input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Password (min 8 characters)" value={formData.password} onChange={handleChange} className="pr-20" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600 rounded-full" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>

                <div className="relative">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm password</label>
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} className="pr-20" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600 rounded-full" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Button type="submit" disabled={loading} className="w-full rounded-full">
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </div>

              <div className="text-center">
                <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Already have an account? Sign in
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
