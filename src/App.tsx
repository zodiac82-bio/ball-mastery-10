import { useCallback, useEffect, useRef, useState } from 'react';
import { beep, unlockAudio } from './audio/beeper';
import { DRILLS, findDrill } from './data/drills';
import type { Drill } from './data/types';
import { useWakeLock } from './hooks/useWakeLock';
import { useWorkout } from './hooks/useWorkout';
import { navigate, routeHref, useRoute } from './router';
import { DrillDetail } from './screens/DrillDetail';
import { Home } from './screens/Home';
import { Records } from './screens/Records';
import { Settings } from './screens/Settings';
import { recordSet, todayRecord, useRecords } from './storage/records';
import { getSettings, useSettings } from './storage/settings';
import { currentItem, makeQueue } from './timer/workout';
import type { WorkoutEvent } from './timer/workout';

/** "완료!" 화면을 자동으로 닫기까지(ms) */
const DONE_CLOSE_MS = 4000;

function onWorkoutEvent(event: WorkoutEvent): void {
  switch (event.type) {
    case 'tick':
      beep(520, 0.12, 0.18);
      break;
    case 'workStart':
      beep(990, 0.35, 0.25);
      break;
    case 'setDone':
      beep(740, 0.5, 0.25);
      recordSet(event.item.drillId);
      break;
    default:
      break;
  }
}

export function App() {
  const route = useRoute();
  const records = useRecords();
  // 운동/휴식/준비 시간과 세트 수. 설정 화면에서 바꾼다
  const config = useSettings();
  // 속도와 소리는 설정의 기본값으로 시작하고, 동작을 넘겨도 유지된다
  const [speed, setSpeed] = useState(() => getSettings().speed);
  const [sound, setSound] = useState(() => getSettings().sound);

  const workout = useWorkout(onWorkoutEvent);
  const { state: workoutState, start: startWorkout, stop: stopWorkout } = workout;
  const item = workoutState ? currentItem(workoutState) : undefined;
  const itemDrillId = item ? item.drillId : null;
  const routeDrillId = route.name === 'drill' ? route.id : null;
  const phase = workoutState ? workoutState.phase : null;

  useWakeLock(phase !== null && phase !== 'done');

  // 타이머와 주소를 맞춘다.
  //  - 루틴이 다음 동작으로 넘어가면 주소도 그 동작으로 바꾼다
  //  - 사용자가 다른 화면으로 가면(목록, 이전/다음, 뒤로 가기) 타이머를 끝낸다
  const followedDrill = useRef<string | null>(null);
  useEffect(() => {
    if (!itemDrillId) {
      followedDrill.current = null;
      return;
    }
    if (followedDrill.current !== itemDrillId) {
      followedDrill.current = itemDrillId;
      if (routeDrillId !== itemDrillId) {
        window.location.replace(routeHref({ name: 'drill', id: itemDrillId }));
      }
      return;
    }
    if (routeDrillId !== itemDrillId) stopWorkout();
  }, [itemDrillId, routeDrillId, stopWorkout]);

  // "완료!"는 잠시 보여 주고 닫는다
  useEffect(() => {
    if (phase !== 'done') return;
    const id = setTimeout(stopWorkout, DONE_CLOSE_MS);
    return () => clearTimeout(id);
  }, [phase, stopWorkout]);

  const routeKey = route.name === 'drill' ? 'drill/' + route.id : route.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  const startDrill = useCallback(
    (drill: Drill) => {
      unlockAudio();
      startWorkout(makeQueue([drill], config.sets), config);
    },
    [startWorkout, config],
  );

  const startRoutine = useCallback(() => {
    const first = DRILLS[0];
    if (!first) return;
    unlockAudio();
    navigate({ name: 'drill', id: first.id });
    startWorkout(makeQueue(DRILLS, config.sets), config);
  }, [startWorkout, config]);

  // 타이머가 돌 때는 타이머의 동작을, 아니면 주소의 동작을 보여 준다
  const drill = itemDrillId
    ? findDrill(itemDrillId)
    : routeDrillId
      ? findDrill(routeDrillId)
      : undefined;

  if (drill) {
    return (
      <DrillDetail
        key={drill.id}
        drill={drill}
        speed={speed}
        onSpeedChange={setSpeed}
        sound={sound}
        onSoundChange={setSound}
        config={config}
        workout={
          workoutState && workout.config
            ? { state: workoutState, config: workout.config, paused: workout.paused }
            : null
        }
        onStartWorkout={() => startDrill(drill)}
        onStopWorkout={stopWorkout}
        onTogglePauseWorkout={workout.togglePause}
      />
    );
  }

  if (route.name === 'records') return <Records records={records} />;

  if (route.name === 'settings') {
    return (
      <Settings
        settings={config}
        onChanged={(next) => {
          if (next.speed !== undefined) setSpeed(next.speed);
          if (next.sound !== undefined) setSound(next.sound);
        }}
      />
    );
  }

  return <Home config={config} doneToday={todayRecord(records)} onStartRoutine={startRoutine} />;
}
