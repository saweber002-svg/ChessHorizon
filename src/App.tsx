import { Router, Switch, Route } from 'wouter';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { WildernessProvider } from '@/contexts/WildernessContext';
// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/Home'));
const WorldMap = lazy(() => import('@/pages/WorldMap'));
const Drill = lazy(() => import('@/pages/Drill'));
const DrillSession = lazy(() => import('@/pages/DrillSession'));
const WatchMode = lazy(() => import('@/pages/WatchMode'));
const Board = lazy(() => import('@/pages/Board'));
const TrophyBoard3D = lazy(() => import('@/pages/TrophyBoard3D'));
const Wilderness = lazy(() => import('@/pages/Wilderness'));
const Clearing = lazy(() => import('@/pages/Clearing'));
const Drills = lazy(() => import('@/pages/Drills'));
const Coaching = lazy(() => import('@/pages/Coaching'));

const Loading = () => (
  <div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
    <p className="text-[#00f5d4] animate-pulse tracking-widest uppercase text-sm">Loading...</p>
  </div>
);

export default function App() {
  const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <AuthProvider>
      <ProgressProvider>
        <WildernessProvider>
          <Suspense fallback={<Loading />}>
            <Router base={routerBase}>
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
              <Route path="/coaching" component={Coaching} />
              <Route path="/:rest*">
                {() => {
                  window.location.href = '/';
                  return null;
                }}
              </Route>
              </Switch>
            </Router>
          </Suspense>
        </WildernessProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}
