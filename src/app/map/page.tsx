import { Metadata } from 'next';
import { getServerAuthSession } from '~/src/server/auth';
import { redirect } from 'next/navigation';
import { Navigation } from '~/src/components/layout/navigation';
import { MapContainer } from '~/src/components/map/map-container';

export const metadata: Metadata = {
  title: 'Emotional Map - Locus',
  description: 'Explore the emotional landscape of places around the world',
};

export default async function MapPage() {
  const session = await getServerAuthSession();
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      <div className="flex-1 relative">
        <MapContainer />
      </div>
    </div>
  );
}
