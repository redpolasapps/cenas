// Ilustraciones del plato terminado. El agente elige una clave por receta ("imagen").
(function(){
  var P = '<ellipse cx="100" cy="108" rx="88" ry="84" fill="rgba(80,50,20,.12)"/><circle cx="100" cy="100" r="88" fill="#fff" stroke="#EFE6D8" stroke-width="3"/><circle cx="100" cy="100" r="68" fill="#FAF6F0"/>';
  var B = '<ellipse cx="100" cy="108" rx="84" ry="80" fill="rgba(80,50,20,.12)"/><circle cx="100" cy="100" r="84" fill="#fff" stroke="#EFE6D8" stroke-width="3"/>';
  function s(x){ return '<svg viewBox="0 0 200 200">'+x+'</svg>'; }
  window.PLATOS = {
    pescado: s(P+
      '<path d="M50 118 L150 96" stroke="#F28C5B" stroke-width="7" stroke-linecap="round"/><path d="M56 128 L146 110" stroke="#7DB56F" stroke-width="7" stroke-linecap="round"/><path d="M62 108 L140 88" stroke="#F7D774" stroke-width="6" stroke-linecap="round"/>'+
      '<g transform="rotate(-12 100 98)"><rect x="56" y="74" width="88" height="44" rx="22" fill="#F7F2EA" stroke="#E6CFA6" stroke-width="3"/><path d="M78 80 q6 18 0 34M96 78 q6 20 0 38M114 78 q6 20 0 38" stroke="#E9DCC6" stroke-width="3" fill="none"/></g>'+
      '<circle cx="138" cy="70" r="15" fill="#F7D774" stroke="#EDBB57" stroke-width="3"/><path d="M138 57v26M125 70h26M129 61l18 18M147 61l-18 18" stroke="#FBE7A6" stroke-width="2"/>'+
      '<circle cx="84" cy="88" r="3" fill="#4E8A45"/><circle cx="104" cy="84" r="3" fill="#4E8A45"/><circle cx="118" cy="92" r="3" fill="#4E8A45"/>'),
    tortilla: s(P+
      '<circle cx="92" cy="96" r="50" fill="#F2C14E"/><circle cx="92" cy="96" r="50" fill="none" stroke="#D99A2B" stroke-width="5"/>'+
      '<path d="M92 96 L142 96 A50 50 0 0 1 117 139 Z" fill="#FAF6F0"/>'+
      '<circle cx="74" cy="80" r="5" fill="#7DB56F"/><circle cx="98" cy="72" r="4" fill="#7DB56F"/><circle cx="70" cy="108" r="4" fill="#7DB56F"/><circle cx="104" cy="92" r="5" fill="#E8A93A"/><circle cx="84" cy="122" r="4" fill="#E8A93A"/><circle cx="60" cy="92" r="3" fill="#D99A2B"/>'+
      '<circle cx="140" cy="134" r="14" fill="#E5533D"/><circle cx="140" cy="134" r="8" fill="#F28C7A"/><circle cx="120" cy="150" r="12" fill="#E5533D"/><circle cx="120" cy="150" r="6" fill="#F28C7A"/><circle cx="132" cy="146" r="2" fill="#4E8A45"/>'),
    crema: s(B+
      '<circle cx="100" cy="100" r="64" fill="#F29A3E"/><circle cx="100" cy="100" r="64" fill="none" stroke="#E07F2A" stroke-width="4"/>'+
      '<path d="M76 100 q12-22 30-10 q16 12 0 24 q-12 8-20-2" stroke="#FCE3C4" stroke-width="5" fill="none" stroke-linecap="round"/>'+
      '<ellipse cx="88" cy="74" rx="5" ry="3" fill="#7DB56F"/><ellipse cx="118" cy="80" rx="5" ry="3" fill="#7DB56F" transform="rotate(30 118 80)"/><ellipse cx="124" cy="118" rx="5" ry="3" fill="#7DB56F"/><ellipse cx="80" cy="124" rx="5" ry="3" fill="#7DB56F" transform="rotate(-30 80 124)"/>'+
      '<g transform="translate(132 132) rotate(-20)"><rect x="-26" y="-14" width="52" height="28" rx="10" fill="#F6926E"/><path d="M-16 -12v24M-4 -13v26M8 -13v26M18 -11v22" stroke="#FCC6AE" stroke-width="3"/><rect x="-26" y="8" width="52" height="6" rx="3" fill="#9C6B55"/></g>'),
    arroz: s('<ellipse cx="100" cy="110" rx="90" ry="84" fill="rgba(80,50,20,.12)"/><circle cx="100" cy="100" r="88" fill="#3B3632"/><circle cx="100" cy="100" r="78" fill="#F2C657"/>'+
      '<g fill="#FBE2A0"><circle cx="70" cy="80" r="3"/><circle cx="128" cy="76" r="3"/><circle cx="60" cy="118" r="3"/><circle cx="140" cy="122" r="3"/><circle cx="100" cy="60" r="3"/><circle cx="100" cy="140" r="3"/><circle cx="86" cy="104" r="3"/></g>'+
      '<g fill="#B5643C"><rect x="74" y="64" width="22" height="16" rx="6"/><rect x="118" y="96" width="22" height="16" rx="6"/><rect x="66" y="126" width="22" height="16" rx="6"/><rect x="104" y="128" width="20" height="14" rx="6"/></g>'+
      '<g fill="#7DB56F"><circle cx="108" cy="80" r="5"/><circle cx="58" cy="98" r="5"/><circle cx="96" cy="118" r="5"/><circle cx="140" cy="76" r="5"/><circle cx="126" cy="146" r="5"/></g>'+
      '<path d="M80 96 l20 -6M124 66 l14 10M48 132 l16 4M112 112 l18 -2" stroke="#E5533D" stroke-width="6" stroke-linecap="round"/>'+
      '<rect x="4" y="94" width="14" height="12" rx="5" fill="#3B3632"/><rect x="182" y="94" width="14" height="12" rx="5" fill="#3B3632"/>'),
    pasta: s(P+
      '<circle cx="100" cy="100" r="56" fill="#D9573E"/>'+
      '<g fill="#F2C657" stroke="#D9A23B" stroke-width="2"><rect x="66" y="74" width="26" height="12" rx="6" transform="rotate(-25 79 80)"/><rect x="100" y="66" width="26" height="12" rx="6" transform="rotate(20 113 72)"/><rect x="118" y="98" width="26" height="12" rx="6" transform="rotate(-40 131 104)"/><rect x="60" y="106" width="26" height="12" rx="6" transform="rotate(35 73 112)"/><rect x="90" y="122" width="26" height="12" rx="6" transform="rotate(-10 103 128)"/><rect x="86" y="92" width="26" height="12" rx="6" transform="rotate(60 99 98)"/></g>'+
      '<g fill="#B5643C"><circle cx="82" cy="96" r="4"/><circle cx="118" cy="86" r="4"/><circle cx="108" cy="114" r="4"/><circle cx="76" cy="126" r="4"/></g>'+
      '<g fill="#FFF6DC"><circle cx="96" cy="84" r="2.5"/><circle cx="112" cy="100" r="2.5"/><circle cx="88" cy="112" r="2.5"/><circle cx="126" cy="116" r="2.5"/><circle cx="72" cy="96" r="2.5"/><circle cx="100" cy="132" r="2.5"/></g>'+
      '<path d="M128 66 q6-4 10 2 q-6 6-10-2z" fill="#4E8A45"/>'),
    pizza: s('<ellipse cx="100" cy="108" rx="86" ry="82" fill="rgba(80,50,20,.12)"/><circle cx="100" cy="100" r="86" fill="#E3A65A"/><circle cx="100" cy="100" r="72" fill="#D9573E"/>'+
      '<g fill="#FBF0D6"><circle cx="78" cy="74" r="14"/><circle cx="124" cy="80" r="12"/><circle cx="98" cy="106" r="15"/><circle cx="70" cy="122" r="12"/><circle cx="128" cy="126" r="13"/></g>'+
      '<g fill="#C9B79C" stroke="#A8957A" stroke-width="2"><path d="M100 70 a8 8 0 0 1 16 0z"/><path d="M60 98 a8 8 0 0 1 16 0z"/><path d="M110 140 a8 8 0 0 1 16 0z"/><path d="M134 102 a8 8 0 0 1 16 0z"/></g>'+
      '<path d="M86 88 q6-6 12 0M112 118 q6-6 12 0M58 106 q6 6 12 0" stroke="#5E9452" stroke-width="5" fill="none" stroke-linecap="round"/>'+
      '<g fill="#F2A7A0"><rect x="88" y="128" width="14" height="10" rx="3"/><rect x="138" y="88" width="12" height="10" rx="3"/><rect x="74" y="58" width="12" height="10" rx="3"/></g>'+
      '<path d="M100 14v172M14 100h172M39 39l122 122M161 39L39 161" stroke="rgba(120,60,20,.25)" stroke-width="2"/>'),
    hamburguesa: s(P+
      '<circle cx="86" cy="96" r="46" fill="#7DB56F"/><circle cx="86" cy="96" r="40" fill="#D99A4E"/><circle cx="86" cy="96" r="40" fill="none" stroke="#B8793A" stroke-width="4"/>'+
      '<g fill="#FFF3D9"><ellipse cx="72" cy="80" rx="3" ry="2"/><ellipse cx="92" cy="74" rx="3" ry="2"/><ellipse cx="104" cy="92" rx="3" ry="2"/><ellipse cx="78" cy="102" rx="3" ry="2"/><ellipse cx="96" cy="112" rx="3" ry="2"/><ellipse cx="66" cy="96" rx="3" ry="2"/></g>'+
      '<path d="M120 128 q14-20 30-6 q-6 22-30 6z" fill="#7DB56F"/><path d="M130 146 q14-20 30-6 q-6 22-30 6z" fill="#5E9452"/>'+
      '<circle cx="146" cy="104" r="11" fill="#E5533D"/><circle cx="146" cy="104" r="5" fill="#F28C7A"/>'+
      '<path d="M82 52 q10 -6 20 0" stroke="#F2C657" stroke-width="6" stroke-linecap="round" fill="none"/>'),
    'pollo-horno': s('<rect x="14" y="34" width="176" height="140" rx="22" fill="rgba(80,50,20,.12)"/><rect x="12" y="28" width="176" height="140" rx="22" fill="#9C9690"/><rect x="22" y="38" width="156" height="120" rx="16" fill="#C9C2BA"/>'+
      '<g fill="#F2C657" stroke="#D9A23B" stroke-width="2"><circle cx="48" cy="62" r="12"/><circle cx="150" cy="70" r="12"/><circle cx="56" cy="136" r="12"/><circle cx="150" cy="136" r="11"/><circle cx="100" cy="142" r="11"/></g>'+
      '<g fill="#B5643C" stroke="#8F4A2A" stroke-width="3"><ellipse cx="82" cy="78" rx="26" ry="18" transform="rotate(-15 82 78)"/><ellipse cx="124" cy="104" rx="26" ry="18" transform="rotate(20 124 104)"/><ellipse cx="78" cy="112" rx="24" ry="17" transform="rotate(10 78 112)"/></g>'+
      '<g fill="#D98A54"><ellipse cx="78" cy="74" rx="10" ry="5"/><ellipse cx="120" cy="100" rx="10" ry="5"/><ellipse cx="74" cy="108" rx="9" ry="5"/></g>'+
      '<circle cx="120" cy="58" r="11" fill="#F7D774" stroke="#EDBB57" stroke-width="3"/><path d="M40 92 l10 -8M150 100 l8 -10M100 60 l-6 -10" stroke="#4E8A45" stroke-width="4" stroke-linecap="round"/>'),
    garbanzos: s(B+
      '<circle cx="100" cy="100" r="64" fill="#E6C89A"/>'+
      '<g fill="#3F7A3A"><path d="M60 92 q14-20 28-4 q-10 18-28 4z"/><path d="M110 132 q14-20 28-4 q-10 18-28 4z"/><path d="M118 64 q14-14 24 2 q-12 14-24-2z"/></g>'+
      '<g fill="#E9B866" stroke="#C99545" stroke-width="2"><circle cx="78" cy="118" r="7"/><circle cx="92" cy="128" r="7"/><circle cx="96" cy="112" r="7"/><circle cx="110" cy="96" r="7"/><circle cx="124" cy="110" r="7"/><circle cx="84" cy="74" r="7"/><circle cx="100" cy="70" r="7"/><circle cx="68" cy="104" r="7"/><circle cx="136" cy="94" r="7"/></g>'+
      '<g><ellipse cx="108" cy="80" rx="16" ry="12" fill="#fff"/><circle cx="108" cy="80" r="7" fill="#F2B632"/><ellipse cx="82" cy="98" rx="16" ry="12" fill="#fff"/><circle cx="82" cy="98" r="7" fill="#F2B632"/></g>'),
    sopa: s(B+
      '<circle cx="100" cy="100" r="64" fill="#EFC56A"/>'+
      '<path d="M60 90 q20-10 40 0 t40 0M58 108 q20 10 40 0 t40 0M70 126 q16-8 30 0 t30 0M72 74 q14 8 28 0 t28 0" stroke="#FBE7B4" stroke-width="3" fill="none"/>'+
      '<g fill="#FFF6DC"><path d="M80 96 q10-8 20 0 q-10 8-20 0z"/><path d="M110 112 q10-8 20 0 q-10 8-20 0z"/><path d="M92 128 q8-6 16 0 q-8 6-16 0z"/></g>'+
      '<g fill="#F28C5B"><circle cx="118" cy="84" r="4"/><circle cx="76" cy="116" r="4"/><circle cx="104" cy="70" r="3"/></g>'+
      '<g fill="#4E8A45"><circle cx="92" cy="84" r="3"/><circle cx="128" cy="98" r="3"/><circle cx="86" cy="138" r="3"/><circle cx="114" cy="132" r="3"/></g>'),
    quesadilla: s(P+
      '<g stroke="#D9A23B" stroke-width="3"><path d="M100 100 L150 70 A58 58 0 0 1 156 118 Z" fill="#F2CE7A"/><path d="M98 104 L150 126 A58 58 0 0 1 110 160 Z" fill="#F2CE7A"/><path d="M94 100 L62 146 A58 58 0 0 1 44 92 Z" fill="#F2CE7A"/><path d="M96 96 L48 78 A58 58 0 0 1 96 42 Z" fill="#F2CE7A"/></g>'+
      '<g fill="#E5533D"><rect x="146" y="88" width="10" height="5" rx="2"/><rect x="120" y="150" width="10" height="5" rx="2"/></g><g fill="#F7D774"><circle cx="152" cy="100" r="3"/><circle cx="134" cy="152" r="3"/><circle cx="54" cy="128" r="3"/></g>'+
      '<g fill="#C88A55"><circle cx="66" cy="62" r="3"/><circle cx="130" cy="96" r="3"/><circle cx="74" cy="110" r="3"/></g>'+
      '<circle cx="100" cy="100" r="14" fill="#F4F0E6"/><circle cx="100" cy="100" r="9" fill="#7DB56F"/>'),
    generico: s(P+
      '<path d="M66 100 q34-40 68 0 q-34 30-68 0z" fill="#E07F63"/><circle cx="80" cy="120" r="12" fill="#7DB56F"/><circle cx="118" cy="122" r="12" fill="#EDBB57"/>')
  };
})();
