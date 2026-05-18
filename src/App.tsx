import { Switch, Route } from 'wouter';
import { useEffect } from 'react';
import { debugLog } from '@/debugLog';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { WildernessProvider } from '@/contexts/WildernessContext';
import Home from '@/pages/Home';
import WorldMap from '@/pages/WorldMap';
import Drill from '@/pages/Drill';
import DrillSession from '@/pages/DrillSession';
import WatchMode from '@/pages/WatchMode';
import Board from '@/pages/Board';
import TrophyBoard3D from '@/pages/TrophyBoard3D';
import Wilderness from '@/pages/Wilderness';
import Clearing from '@/pages/Clearing';
import Drills from '@/pages/Drills';

export default function App() {
  useEffect(() => {
    // #region agent log
    debugLog('H3', 'App.tsx:mount', 'App mounted', { path: window.location.pathname });
    // #endregion
  }, []);

  return (
    <AuthProvider>
      <ProgressProvider>
        <WildernessProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/atlas" component={WorldMap} />
            <Route path="/drill/:openingId/:variationId/:moveIndex" component={Drill} />
            <Route path="/drill-session/:drillFileId" component={DrillSession} />            
            <Route path="/watch-mode/:drillFileId" component={WatchMode} />          
            <Route path="/drills" component={Drills} />
            <Route path="/board/:openingId/:variationId" component={Board} />
            <Route path="/trophy/:openingId/:variationId" component={TrophyBoard3D} />
            <Route path="/wilderness" component={Wilderness} />
            <Route path="/clearing" component={Clearing} />
            <Route path="/:rest*">
              {() => {
                window.location.href = '/';
                return null;
              }}
            </Route>
          </Switch>
        </WildernessProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}
