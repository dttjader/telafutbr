import { getPartidas, getTimes, getEstadios } from '@/lib/data';
import { RodadasClient } from '@/components/RodadasClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [partidas, times, estadios] = await Promise.all([getPartidas(), getTimes(), getEstadios()]);
  return <RodadasClient partidas={partidas} times={times} estadios={estadios} />;
}
