interface DrillStartEvent {
  type: 'drill_start';
  variationId: string;
  moveIndex: number;
  timestamp: number;
}

interface DrillCompleteEvent {
  type: 'drill_complete';
  variationId: string;
  moveIndex: number;
  stars: number;
  attempts: number;
  hintUsed: boolean;
  timestamp: number;
}

interface DrillFailEvent {
  type: 'drill_fail';
  variationId: string;
  moveIndex: number;
  attempts: number;
  timestamp: number;
}

export function drillStart(variationId: string, moveIndex: number) {
  const event: DrillStartEvent = {
    type: 'drill_start',
    variationId,
    moveIndex,
    timestamp: Date.now(),
  };
  console.log('[Analytics]', event);
}

export function drillComplete(
  variationId: string,
  moveIndex: number,
  stars: number,
  attempts: number,
  hintUsed: boolean
) {
  const event: DrillCompleteEvent = {
    type: 'drill_complete',
    variationId,
    moveIndex,
    stars,
    attempts,
    hintUsed,
    timestamp: Date.now(),
  };
  console.log('[Analytics]', event);
}

export function drillFail(
  variationId: string,
  moveIndex: number,
  attempts: number
) {
  const event: DrillFailEvent = {
    type: 'drill_fail',
    variationId,
    moveIndex,
    attempts,
    timestamp: Date.now(),
  };
  console.log('[Analytics]', event);
}
