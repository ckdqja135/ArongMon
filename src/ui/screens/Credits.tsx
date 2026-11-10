import { useEffect, useState, type ReactNode } from 'react';
import { isShiny, monName, spec } from '../../battle/mon';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { playMusic } from '../../engine/sound';
import { G } from '../../game/game';
import { openOverlay } from '../overlay';
import { BadgeImg, MonImg } from '../widgets';

/** 엔딩 크레딧. 장면이 천천히 넘어가고, A를 누르면 다음 장면으로. 마지막 장면에서 A를 누르면 끝난다 */
export const openCredits = () => openOverlay<void>((done) => <Credits onDone={done} />);

interface Scene {
  /** 보여 주는 시간 (ms). 0이면 A를 누를 때까지 */
  ms: number;
  body: ReactNode;
}

const BADGES: [string, string, string][] = [
  ['feather', '깃털', '이슬시티'],
  ['antenna', '더듬이', '단풍마을'],
  ['heart', '하트', '한빛시티'],
  ['spirit', '혼령', '보라시티'],
  ['fist', '주먹', '섬도시'],
  ['steel', '강철', '항구시티'],
  ['glacier', '얼음', '서리마을'],
  ['dragon', '용비늘', '용의 마을'],
];

/** 이름을 부르는 말: 아롱이 → 아롱아 */
function callName(name: string) {
  const base = name.length > 1 && name.endsWith('이') ? name.slice(0, -1) : name;
  return josa(base, '아/야');
}

const Lines = ({ children }: { children: string }) => (
  <div className="cr-lines">
    {children.split('\n').map((l, i) => (
      <div key={i} style={{ animationDelay: `${0.6 + i * 0.7}s` }}>
        {l || ' '}
      </div>
    ))}
  </div>
);

function scenes(): Scene[] {
  const s = G.save;
  const me = s.playerName;
  const arong = [...s.party, ...s.box].find((m) => spec(m).unlimitedMoves);
  const name = arong ? monName(arong) : '아롱이';
  const call = callName(name);
  const h = Math.floor(s.playSeconds / 3600);
  const m = Math.floor((s.playSeconds % 3600) / 60);
  const team = s.party.filter((x) => x.hp >= 0);
  return [
    { ms: 6500, body: <Lines>{`모든 것은 그날 아침,\n느티 박사의 연구소에서\n시작되었다.`}</Lines> },
    {
      ms: 8000,
      body: (
        <>
          <MonImg species="arong" view="front" className="cr-mon" />
          <Lines>{`손바닥만 한 털뭉치였던 너는\n누구보다 먼저\n내 앞으로 나섰지.`}</Lines>
        </>
      ),
    },
    {
      ms: 8000,
      body: (
        <>
          <MonImg species="arong2" view="front" className="cr-mon" />
          <Lines>{`혀를 쏙 내밀고\n세상 모든 게 궁금했던 너와\n우리는 참 많은 길을 걸었다.`}</Lines>
        </>
      ),
    },
    {
      ms: 9000,
      body: (
        <div className="cr-badges">
          {BADGES.map(([id, badge, town], i) => (
            <div key={id} className="cr-badge" style={{ animationDelay: `${0.4 + i * 0.6}s` }}>
              {/* 그림자 위에 진짜 배지가 하나씩 반짝이며 떠오른다 */}
              <div className="gem">
                <BadgeImg id={id} on={false} />
                {s.badges.includes(id) && <BadgeImg id={id} on className="lit" style={{ animationDelay: `${0.9 + i * 0.6}s` }} />}
              </div>
              <span className="town">{town}</span>
              <span className="small">{badge}배지</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      ms: 8500,
      body: (
        <>
          <MonImg species="arong3" view="front" className="cr-mon" />
          <Lines>{`로켓단이 너를 데려가려던 날,\n너는 스스로 줄을 끊고\n내게 달려왔지.`}</Lines>
        </>
      ),
    },
    { ms: 8000, body: <Lines>{`타입이 없는 게 아니었어.\n\n그 무엇에도 물들지 않는 마음.\n그게 바로 너였어.`}</Lines> },
    {
      ms: 10000,
      body: (
        <>
          <div className="cr-title">명예의 전당</div>
          <div className="cr-team">
            {team.map((x, i) => (
              <div key={x.uid} className="cr-member" style={{ animationDelay: `${0.5 + i * 0.5}s` }}>
                <MonImg species={x.species} view="front" shiny={isShiny(x)} />
                <div className="small">{monName(x)}</div>
                <div className="small lv">Lv.{x.level}</div>
              </div>
            ))}
          </div>
          <div className="small cr-foot">
            <div>
              {me}의 모험 {h}시간 {m}분
            </div>
            <div>
              만난 몬스터 {s.seen.length} · 함께한 몬스터 {s.caught.length}
            </div>
          </div>
        </>
      ),
    },
    {
      ms: 42000,
      body: (
        <div className="cr-roll">
          <div className="big">아롱몬</div>
          <div className="gap" />
          <div className="role">주인공</div>
          <div>{me}</div>
          <div className="role">언제나 곁에 있었던 친구</div>
          <div>{name}</div>
          <div className="role">라이벌</div>
          <div>{s.rivalName}</div>
          <div className="role">드래곤 조련사 · 챔피언</div>
          <div>진</div>
          <div className="role">체육관 관장</div>
          <div>나래 · 여름 · 다솜 · 해솔</div>
          <div>무쇠 · 시린 · 백설 · 단비</div>
          <div className="role">사천왕</div>
          <div>수정 · 청사 · 태산 · 밤비</div>
          <div className="role">로켓단</div>
          <div>흑월 · 암영</div>
          <div className="role">언제나 집에서 기다려 준</div>
          <div>엄마 · 느티 박사</div>
          <div className="gap" />
          <div className="role">등장 몬스터</div>
          <div>1세대 151마리</div>
          <div className="gap" />
          <div className="role">만든 사람</div>
          <div>아롱이네 가족</div>
          <div className="gap" />
          <div className="gap" />
          <div className="gap" />
          <div>그리고</div>
          <div>세상에서 제일 소중한</div>
          <div className="big">{name}</div>
        </div>
      ),
    },
    {
      ms: 0,
      body: (
        <>
          <MonImg species={arong?.species ?? 'arong3'} view="front" className="cr-mon last" />
          <span className="cr-heart">♥</span>
          <Lines>{`${call}, 고마워.\n앞으로도 오래오래 함께하자.`}</Lines>
          <div className="cr-end">THE END</div>
          <div className="small cr-after">...그리고 우리의 산책은 계속된다.</div>
        </>
      ),
    },
  ];
}

function Credits({ onDone }: { onDone: () => void }) {
  const [list] = useState(scenes);
  const [i, setI] = useState(0);
  const scene = list[i];
  const last = i === list.length - 1;
  useEffect(() => playMusic('ending'), []);
  useEffect(() => {
    if (!scene.ms) return;
    const t = setTimeout(() => setI((v) => Math.min(list.length - 1, v + 1)), scene.ms);
    return () => clearTimeout(t);
  }, [i, scene.ms, list.length]);
  // 마지막 장면은 글이 다 떠오른 뒤에야 넘길 수 있다
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, [last]);
  useButtons((b) => {
    if (b !== 'a') return;
    if (last) ready && onDone();
    else setI(i + 1);
  });
  return (
    <div className="credits">
      <div key={i} className={`cr-scene${scene.ms ? '' : ' hold'}`} style={scene.ms ? { animationDuration: `${scene.ms}ms` } : undefined}>
        {scene.body}
      </div>
      {last && ready && <div className="cr-press small">A 버튼</div>}
    </div>
  );
}
