'use client';

import { useState } from 'react';
import { signIn, type ClientSafeProvider } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailForm = z.infer<typeof emailSchema>;

interface SignInFormProps {
  providers: Record<string, ClientSafeProvider> | null;
  callbackUrl?: string;
  error?: string;
}

const errorMessages: Record<string, string> = {
  Signin: 'Try signing in with a different account.',
  OAuthSignin: 'Try signing in with a different account.',
  OAuthCallback: 'Try signing in with a different account.',
  OAuthCreateAccount: 'Try signing in with a different account.',
  EmailCreateAccount: 'Try signing in with a different account.',
  Callback: 'Try signing in with a different account.',
  OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
  EmailSignin: 'The e-mail could not be sent.',
  CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
  SessionRequired: 'Please sign in to access this page.',
  default: 'Unable to sign in.',
};

export function SignInForm({ providers, callbackUrl, error }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const handleEmailSignIn = async (data: EmailForm) => {
    setIsLoading('email');
    
    try {
      const result = await signIn('email', {
        email: data.email,
        callbackUrl: callbackUrl ?? '/map',
        redirect: false,
      });

      if (result?.ok) {
        setEmailSent(true);
      }
    } catch (err) {
      console.error('Email sign in error:', err);
    } finally {
      setIsLoading(null);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setIsLoading(providerId);
    
    try {
      await signIn(providerId, {
        callbackUrl: callbackUrl ?? '/map',
      });
    } catch (err) {
      console.error('OAuth sign in error:', err);
    } finally {
      setIsLoading(null);
    }
  };

  if (emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Check your email
          </CardTitle>
          <CardDescription>
            We sent you a sign-in link. Check your email and click the link to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEmailSent(false)}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessages[error] || errorMessages.default}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Sign In */}
        <form onSubmit={handleSubmit(handleEmailSignIn)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isLoading !== null}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading !== null}
          >
            {isLoading === 'email' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign in with Email
          </Button>
        </form>

        {/* OAuth Providers */}
        {providers && Object.values(providers).filter(p => p.id !== 'email').length > 0 && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {Object.values(providers)
                .filter((provider) => provider.id !== 'email')
                .map((provider) => (
                  <Button
                    key={provider.name}
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn(provider.id)}
                    disabled={isLoading !== null}
                  >
                    {isLoading === provider.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {provider.name}
                  </Button>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
