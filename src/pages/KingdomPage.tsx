import { useLocation, useParams } from 'wouter';
import { KingdomInterior } from '@/components/world-map/KingdomInterior';
import type { KingdomId } from '@/types';
import { MAP_LOCATIONS } from '@/data/mapLocations';

const VALID_KINGDOMS = new Set(MAP_LOCATIONS.map((l) => l.kingdom));

export default function KingdomPage() {
  const params = useParams<{ kingdomId: string }>();
  const [, setLocation] = useLocation();
  const kingdomId = params.kingdomId ?? '';

  if (!VALID_KINGDOMS.has(kingdomId as KingdomId)) {
    setLocation('/atlas');
    return null;
  }

  const kingdom = kingdomId as KingdomId;

  return (
    <KingdomInterior
      kingdom={kingdom}
      onBack={() => setLocation('/atlas')}
      onSelectDrill={(drillFileId, openingId, variationId) =>
        setLocation(
          `/drill-session/${drillFileId}?opening=${openingId}&variation=${variationId}`
        )
      }
    />
  );
}
