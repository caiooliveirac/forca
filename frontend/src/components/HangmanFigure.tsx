import { useEffect, useState } from 'react';

interface HangmanFigureProps {
  wrongGuesses: number;
  isLost: boolean;
  isWon: boolean;
}

export const HangmanFigure = ({ wrongGuesses, isLost, isWon }: HangmanFigureProps) => {
  const [deathAnim, setDeathAnim] = useState(false);
  const [winPhase, setWinPhase] = useState(0); // 0=none, 1=rope-break, 2=falling, 3=happy+arms

  useEffect(() => {
    if (isLost) {
      setDeathAnim(true);
    } else {
      setDeathAnim(false);
    }
  }, [isLost]);

  useEffect(() => {
    if (isWon) {
      // t=0s: rope breaks
      setWinPhase(1);
      // t=0.3s: body falls
      const t1 = setTimeout(() => setWinPhase(2), 300);
      // t=0.7s: happy face + arms up
      const t2 = setTimeout(() => setWinPhase(3), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setWinPhase(0);
    }
  }, [isWon]);

  const show = (partIndex: number) => wrongGuesses > partIndex;

  // During win phases 2+3, hide regular arms & hands (parts 2,3,6,7)
  const hideForWin = winPhase >= 2 ? new Set([2, 3, 6, 7]) : new Set<number>();
  const partStyle = (partIndex: number) => ({
    opacity: show(partIndex) ? (hideForWin.has(partIndex) ? 0 : 1) : 0,
    transition: 'opacity 0.3s ease',
  });

  const chalkColor = '#E8E0D0';

  const gallowsStroke = {
    stroke: chalkColor,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    fill: 'none',
    filter: 'url(#chalkTex)',
  };

  const bodyStroke = {
    stroke: chalkColor,
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    fill: 'none',
    filter: 'url(#chalkTex)',
  };

  // Body geometry: hangs from rope at (170, 70)
  // Head center at (170, 88), r=17
  // Neck at y=105, body to y=165
  // Arms from y=120, hands at y=148
  // Legs from y=165 to y=210

  const isHappy = winPhase >= 3;
  const showNeutralFace = show(0) && !isLost && !isHappy;
  const showHappyFace = show(0) && isHappy;
  const showDeadFace = show(0) && isLost;

  return (
    <div
      className="flex items-center justify-center"
      aria-label={`Forca: ${wrongGuesses} de 8 erros`}
      role="img"
    >
      <svg
        viewBox="0 0 280 300"
        className="w-full max-w-[300px] h-auto"
        aria-hidden="true"
      >
        <defs>
          {/* Chalk texture filter */}
          <filter id="chalkTex" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* ===== GALLOWS (always visible, 4 elements) ===== */}
        {/* a) Base */}
        <line data-part="gallows" x1="20" y1="280" x2="150" y2="280" {...gallowsStroke} strokeWidth={4} />
        {/* b) Post */}
        <line data-part="gallows" x1="60" y1="280" x2="60" y2="28" {...gallowsStroke} strokeWidth={4} />
        {/* c) Beam */}
        <line data-part="gallows" x1="58" y1="30" x2="172" y2="30" {...gallowsStroke} strokeWidth={4} />
        {/* d) Rope */}
        <line
          data-part="gallows"
          x1="170"
          y1="30"
          x2="170"
          y2="70"
          {...gallowsStroke}
          strokeWidth={2}
          className={winPhase >= 1 ? 'animate-rope-break' : ''}
        />

        {/* ===== BODY GROUP ===== */}
        <g
          data-testid="bodyGroup"
          className={
            deathAnim
              ? 'animate-pendulum-death'
              : winPhase >= 2
                ? 'animate-drop-free'
                : ''
          }
          style={{ transformOrigin: '170px 30px' }}
        >
          {/* Part 1: Head */}
          <circle
            cx="170"
            cy="88"
            r="17"
            {...bodyStroke}
            style={partStyle(0)}
          />

          {/* NEUTRAL FACE: small dot eyes + gentle smile */}
          {showNeutralFace && (
            <g style={{ opacity: 0.6 }}>
              <circle cx="163" cy="85" r="1.8" fill={chalkColor} />
              <circle cx="177" cy="85" r="1.8" fill={chalkColor} />
              <path d="M162 93 Q170 98 178 93" stroke={chalkColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* DEAD FACE: X eyes + sad mouth */}
          {showDeadFace && (
            <g style={{ opacity: 1 }} filter="url(#chalkTex)">
              <line x1="160" y1="82" x2="166" y2="88" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" />
              <line x1="166" y1="82" x2="160" y2="88" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" />
              <line x1="174" y1="82" x2="180" y2="88" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" />
              <line x1="180" y1="82" x2="174" y2="88" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" />
              <path d="M162 96 Q170 92 178 96" stroke={chalkColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* HAPPY FACE: ∪∪ arc eyes + big smile */}
          {showHappyFace && (
            <g style={{ opacity: 0.8 }} filter="url(#chalkTex)">
              {/* Left eye ∪ arc */}
              <path d="M160 87 Q163 82 166 87" stroke={chalkColor} strokeWidth={2} fill="none" strokeLinecap="round" />
              {/* Right eye ∪ arc */}
              <path d="M174 87 Q177 82 180 87" stroke={chalkColor} strokeWidth={2} fill="none" strokeLinecap="round" />
              {/* Big smile */}
              <path d="M161 93 Q170 101 179 93" stroke={chalkColor} strokeWidth={1.8} fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* Part 2: Body */}
          <line x1="170" y1="105" x2="170" y2="165" {...bodyStroke} style={partStyle(1)} />

          {/* Part 3: Left arm */}
          <line x1="170" y1="120" x2="145" y2="148" {...bodyStroke} style={partStyle(2)} />

          {/* Part 4: Right arm */}
          <line x1="170" y1="120" x2="195" y2="148" {...bodyStroke} style={partStyle(3)} />

          {/* Part 5: Left leg */}
          <line x1="170" y1="165" x2="148" y2="210" {...bodyStroke} style={partStyle(4)} />

          {/* Part 6: Right leg */}
          <line x1="170" y1="165" x2="192" y2="210" {...bodyStroke} style={partStyle(5)} />

          {/* Part 7: Left hand */}
          <circle cx="145" cy="148" r="4" {...bodyStroke} strokeWidth={2} style={partStyle(6)} />

          {/* Part 8: Right hand */}
          <circle cx="195" cy="148" r="4" {...bodyStroke} strokeWidth={2} style={partStyle(7)} />

          {/* WIN: Arms raised in celebration (replaces regular arms 2,3,6,7) */}
          {winPhase >= 3 && show(2) && (
            <g className="animate-arms-raise" filter="url(#chalkTex)">
              {/* Left arm up */}
              <line x1="170" y1="120" x2="142" y2="95" stroke={chalkColor} strokeWidth={2.5} strokeLinecap="round" fill="none" />
              {/* Right arm up */}
              <line x1="170" y1="120" x2="198" y2="95" stroke={chalkColor} strokeWidth={2.5} strokeLinecap="round" fill="none" />
              {/* Left hand up */}
              <circle cx="142" cy="95" r="4" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" fill="none" />
              {/* Right hand up */}
              <circle cx="198" cy="95" r="4" stroke={chalkColor} strokeWidth={2} strokeLinecap="round" fill="none" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
