import { Metadata } from 'next';
import { getProviders } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { authOptions } from '~/src/server/auth';
import { SignInForm } from '~/src/components/auth/signin-form';

export const metadata: Metadata = {
  title: 'Sign In - Locus',
  description: 'Sign in to your Locus account',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await getServerSession(authOptions);
  
  // Redirect to map if already signed in
  if (session) {
    redirect(searchParams.callbackUrl ?? '/map');
  }

  const providers = await getProviders();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Locus
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to explore emotional landscapes
          </p>
        </div>
        <SignInForm 
          providers={providers}
          callbackUrl={searchParams.callbackUrl}
          error={searchParams.error}
        />
      </div>
    </div>
  );
}
