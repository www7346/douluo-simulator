import {useId} from 'react';

export type ChoiceMotif='strike'|'shield'|'heal'|'bind'|'frost'|'flame'|'spirit'|'wing'|'summon'|'device'|'vial'|'blade'|'poison'|'bracer'|'breastplate'|'pendant'|'boots'|'crown'|'necklace'|'staff'|'gloves';

/** Original silhouettes, selected by mechanics rather than generated names. */
export default function ChoiceEmblem({motif}:{motif:ChoiceMotif}){
  const id=useId().replace(/:/g,'');
  return <svg className="choice-emblem" viewBox="0 0 240 200" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff4ce"/><stop offset=".5" stopColor="currentColor"/><stop offset="1" stopColor="#857257"/></linearGradient></defs>
    <g className="choice-emblem__orbit" fill="none" stroke="currentColor"><circle cx="120" cy="100" r="76"/><circle cx="120" cy="100" r="69" strokeDasharray="1 13"/><path d="m120 12 7 12-7 12-7-12ZM120 164l7 12-7 12-7-12ZM32 100l12-7 12 7-12 7ZM184 100l12-7 12 7-12 7Z"/><path d="M58 42 43 60M182 42l15 18M58 158l-15-18M182 158l15-18"/></g>
    <g fill={`url(#${id})`} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      {motif==='gloves'&&<><path d="M79 156V97L63 74q-5-12 8-15l23 23V47q0-14 13-12l6 40V36q8-13 16 0l2 39 5-30q9-12 16 1l-1 37 8-17q12-6 15 6l-7 51-23 33Z"/><path d="M80 143h64v26H80Z"/><path d="m120 91 20 18-20 24-20-24Z" fill="#142a3d"/><path d="m87 152 48 0" fill="none" stroke="#142a3d" strokeWidth="5"/></>}
      {motif==='bracer'&&<><path d="m88 43 65 9-10 108-67-13Z"/><path d="m88 60 61 9M83 124l62 9" fill="none" stroke="#142a3d" strokeWidth="7"/><path d="m118 76 18 25-22 27-14-32Z" fill="#142a3d"/></>}
      {motif==='breastplate'&&<><path d="m82 45 20-8q18 23 36 0l20 8-1 26 23 20-21 66-39 11-39-11-21-66 23-20Z"/><path d="m120 65 30 32-30 50-30-50Z" fill="#142a3d"/><path d="m120 83 13 17-13 24-13-24Z"/></>}
      {motif==='pendant'&&<><path d="M74 52q46-25 92 0v19q-46-21-92 0Z"/><path d="M120 65v30" fill="none" strokeWidth="7"/><path d="m120 86 29 28-29 37-29-37Z"/><path d="m120 101 12 13-12 17-12-17Z" fill="#142a3d"/><path d="M108 144v27M120 150v28M132 144v27" fill="none" strokeWidth="4"/></>}
      {motif==='boots'&&<><path d="m78 48 32 6-5 70 23 19-5 18H64v-22l17-24ZM130 43l33 6-6 70 24 18-4 18h-45l-1-22 10-20Z"/><path d="m80 73 26 4M132 68l26 4M76 94l28 4M129 89l28 4" fill="none" stroke="#142a3d" strokeWidth="6"/></>}
      {motif==='crown'&&<><path d="m61 69 29 21 30-42 30 42 29-21-14 72H75Z"/><path d="M76 128h88" fill="none" stroke="#142a3d" strokeWidth="8"/><path d="m120 81 15 24-15 16-15-16Z" fill="#142a3d"/><circle cx="60" cy="63" r="6"/><circle cx="180" cy="63" r="6"/></>}
      {motif==='necklace'&&<><path d="M78 47q-22 62 42 91 64-29 42-91" fill="none" strokeWidth="7"/><path d="m120 110 23 29-23 31-23-31Z"/><path d="m120 126 9 13-9 15-9-15Z" fill="#142a3d"/><path d="M78 47q40-17 84 0" fill="none" strokeWidth="3"/></>}
      {motif==='staff'&&<><path d="m106 90 12 3-21 81-12-3Z"/><path d="m138 29 21 29-29 42-23-8-5-40Z"/><path d="m134 46 9 15-17 22-10-27Z" fill="#142a3d"/><path d="m109 100 14 4M103 119l14 4" fill="none" strokeWidth="5"/></>}
      {motif==='strike'&&<><path d="m138 38-59 74h37l-13 51 61-81h-38Z"/><path d="m73 52-9 26 18-6M168 151l9-28-18 8" fill="none"/></>}
      {motif==='shield'&&<><path d="M120 42q-19 18-49 20v43q3 36 49 58 46-22 49-58V62q-30-2-49-20Z"/><path d="m120 62 30 13v29q-1 24-30 41-29-17-30-41V75Z" fill="#fff8e2"/><path d="m120 76 9 21 17 5-17 8-9 21-9-21-17-8 17-5Z"/></>}
      {motif==='heal'&&<><path d="M120 161q-55-35-51-77 36-3 51 40 15-43 51-40 4 42-51 77Z"/><path d="M109 40h22v22h22v22h-22v22h-22V84H87V62h22Z"/><path d="m83 105 37 55 37-55" fill="none" stroke="#152e3e"/></>}
      {motif==='bind'&&<><path d="M95 52q-27 3-27 29 0 12 10 23l26 26q17 17 33 0l10-10-14-14-10 10q-3 3-7-1L90 89q-12-15 5-17h18V52Z"/><path d="M145 148q27-3 27-29 0-12-10-23l-26-26q-17-17-33 0L93 80l14 14 10-10q3-3 7 1l26 26q12 15-5 17h-18v20Z"/></>}
      {motif==='frost'&&<><path d="m120 39 12 39 33-17-18 32 35 7-35 9 18 32-33-18-12 38-12-38-33 18 18-32-35-9 35-7-18-32 33 17Z"/><path d="m120 74 17 26-17 27-17-27Z" fill="#172e47"/></>}
      {motif==='flame'&&<><path d="M122 37q13 29 5 44 18-4 24-22 41 49 17 80-19 28-51 22-55-9-40-56 7-20 25-29-7 32 8 33 21-3 12-72Z"/><path d="M122 97q-32 30-18 47 12 16 27 5 22-16-9-52Z" fill="#142a3d"/></>}
      {motif==='poison'&&<><path d="M120 39q-13 34-34 60-28 41 9 60 25 13 50-1 34-18 6-58-20-26-31-61Z"/><path d="m96 108 17 6-6 13-15-6ZM143 108l-17 6 6 13 15-6ZM111 138h18v13h-18Z" fill="#142a3d"/><path d="m69 55-10 19 12 11 10-14ZM165 140l10 16-7 10-11-10Z"/></>}
      {motif==='spirit'&&<><path d="M53 101q66-83 134 0-68 75-134 0Z"/><path d="M120 69a32 32 0 1 0 0 64 32 32 0 0 0 0-64Z" fill="#152a3e"/><path d="m120 76 13 25-13 26-13-26Z"/><path d="m120 37 5 14-5 11-5-11ZM120 140l5 13-5 14-5-14Z"/></>}
      {motif==='wing'&&<><path d="M112 146q-52-1-60-71 25 30 57 19-14 13-38 6 12 20 38 13-6 13-27 9 14 15 30 12ZM128 146q52-1 60-71-25 30-57 19 14 13 38 6-12 20-38 13 6 13 27 9-14 15-30 12Z"/><path d="m120 55 12 41-12 70-12-70Z"/></>}
      {motif==='summon'&&<><path d="m74 51 39 20 14-17 42-9-12 39 19 47-41 26-49-23 8-39Z"/><path d="m99 93 15 8-8 11-17-12ZM146 87l-8 16 10 3 10-22ZM120 121l21 1-12 13Z" fill="#132639"/></>}
      {motif==='device'&&<><path d="m110 42 20 0 6 19 19 8 17-7 14 17-11 17 0 17 11 14-14 18-19-7-17 9-6 18h-20l-6-18-17-9-19 7-14-18 11-14V96L54 79l14-17 17 7 19-8Z"/><circle cx="120" cy="104" r="35" fill="#12283d"/><path d="m120 77 18 27-18 27-18-27Z"/></>}
      {motif==='vial'&&<><path d="M103 40h34v17h-34ZM107 57h26v35l30 38q9 32-43 32-52 0-43-32l30-38Z"/><path d="M89 128q30 11 62 0 16 25-31 25-45 0-31-25Z" fill="#17364b"/><path d="m119 86 5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" fill="#17364b"/></>}
      {motif==='blade'&&<><path d="m168 37-17 59-45 43-20-18 48-44Z"/><path d="m77 113 44 35-7 10-45-34ZM78 134l19 15-26 32-18-16Z"/><path d="m168 37-70 91" fill="none" stroke="#15304a"/></>}
    </g>
  </svg>;
}
