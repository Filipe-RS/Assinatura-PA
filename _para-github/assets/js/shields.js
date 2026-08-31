/* =========================================================================
   Catálogo de escudos.
   Para adicionar uma unidade: coloque o PNG (fundo transparente) em
   assets/img/shields/ e acrescente uma entrada abaixo.
     id    -> identificador único, sem espaços/acentos (usado no salvamento)
     label -> texto exibido ao usuário
     group -> aba/grupo na tela de seleção
     src   -> caminho do arquivo, relativo à raiz do projeto
   ========================================================================= */
const SHIELDS = [
  { id: "inst_color",    label: "PMMG — colorido",         group: "Institucional",   src: "assets/img/shields/inst_color.png" },
  { id: "inst_preto",    label: "PMMG — preto",            group: "Institucional",   src: "assets/img/shields/inst_preto.png" },
  { id: "inst_dourado",  label: "PMMG — dourado",          group: "Institucional",   src: "assets/img/shields/inst_dourado.png" },
  { id: "wordmark",      label: "PMMG — letras",           group: "Institucional",   src: "assets/img/shields/wordmark.png" },
  { id: "3rpm",          label: "3ª RPM",                  group: "3ª RPM",          src: "assets/img/shields/3rpm.png" },
  { id: "em3rpm",        label: "EM 3ª RPM",               group: "3ª RPM",          src: "assets/img/shields/em3rpm.png" },
  { id: "1cia",          label: "1ª Cia PM Ind",           group: "Unidades",        src: "assets/img/shields/1cia.png" },
  { id: "3cia_ger",      label: "3ª Cia PM Ind GER",       group: "Unidades",        src: "assets/img/shields/3cia_ger.png" },
  { id: "3cia_pvd",      label: "3ª Cia PM Ind PVD",       group: "Unidades",        src: "assets/img/shields/3cia_pvd.png" },
  { id: "8cia",          label: "8ª Cia PM Ind",           group: "Unidades",        src: "assets/img/shields/8cia.png" },
  { id: "35bpm",         label: "35º BPM",                 group: "Unidades",        src: "assets/img/shields/35bpm.png" },
  { id: "36bpm",         label: "36º BPM",                 group: "Unidades",        src: "assets/img/shields/36bpm.png" },
  { id: "52bpm",         label: "52º BPM",                 group: "Unidades",        src: "assets/img/shields/52bpm.png" },
  { id: "61bpm",         label: "61º BPM",                 group: "Unidades",        src: "assets/img/shields/61bpm.png" },
];
