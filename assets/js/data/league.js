export const APP_CONFIG = {
  leagueLogo: 'https://i.imgur.com/WtPNWIp.png',
  sponsorLogo: 'https://i.imgur.com/OokjEsG.png'
};

export const TEAMS = {
  10000001:{id:10000001,name:'Shaktar Meminetsk',short:'Meminetsk',logo:'https://i.imgur.com/bZef6vv.png',color:'#f59e0b',bio:'O time que ganhou tudo em 2024 e ainda acha que é melhor que todo mundo. Spoiler: provavelmente é.',titles:['Premier League IOS 2024','Pontos Corridos 2024','IOS World Cup 2026','Cartoleiro de Ouro 2024'],owner:'Meminetsk'},
  10000002:{id:10000002,name:'INTER DE BIGÃO',short:'Inter de Bigão',logo:'https://i.imgur.com/Qin2x8K.png',color:'#2563eb',bio:'Bicampeão que some durante a temporada e aparece no fim só pra estragar a festa dos outros. Clássico Bigo.',titles:['Pontos Corridos/1 2025','Copa IOS 2025'],owner:'Bigão'},
  10000003:{id:10000003,name:'ValeGuiDoce Esporte Clube',short:'ValeGuiDoce',logo:'https://i.imgur.com/JNGsVyP.png',color:'#ef4444',bio:'Ganhou tudo que tinha pra ganhar em 2025, inclusive o Mundial. Agora só falta comprar humildade no mercado.',titles:['Premier League IOS 2025','Pontos Corridos/2 2025','Pontos Corridos/1 2026','IOS Club World Cup 2025','Cartoleiro de Ouro 2025'],owner:'ValeGuiDoce'},
  10000004:{id:10000004,name:'Rafa Casablanca Athletic',short:'Rafa Casablanca',logo:'https://i.imgur.com/xudTm8m.png',color:'#22c55e',bio:'O maior time da liga sem título. Uma tragédia grega com escudo bonito.',titles:[],owner:'Rafa Casa'},
  10000005:{id:10000005,name:'Manteto United FC',short:'Manteto',logo:'https://i.imgur.com/lIANr73.png',color:'#dc2626',bio:'Venceu a Copa IOS 2024 e desde então age como se tivesse ganho a Champions. Tega aprova essa mensagem.',titles:['Copa IOS 2024','Copa IOS 2026'],owner:'Manteto'},
  10000006:{id:10000006,name:'Rafalovers FC',short:'RafaLovers',logo:'https://i.imgur.com/wkVF1ai.png',color:'#111827',bio:'71 partidas para conseguir o primeiro MVP. A definição de esperança com sofrimento crônico.',titles:[],owner:'RafaLovers'},
  10000007:{id:10000007,name:'Easy Money Sn1per',short:'Easy Money',logo:'https://i.imgur.com/JiOO32s.png',color:'#1e3a8a',bio:'Primeiro campeão da liga. Depois saiu de cena e o time nunca mais voltou ao topo.',titles:['Premier League IOS 2023','Cartoleiro de Ouro 2023'],owner:'Easy Money'},
  10000008:{id:10000008,name:'Grishatasaray',short:'Grishatasaray',logo:'https://i.imgur.com/gt8KWko.png',color:'#f97316',bio:'Abandonou em 2024, ficou fora em 2025, voltou em 2026 para perder todas. Consistência é tudo.',titles:[],owner:'Grisha'},
  10000009:{id:10000009,name:'Paris Saint Zuis',short:'PS Zuis',logo:'https://i.imgur.com/TwecIpU.png',color:'#1d4ed8',bio:'Chegou em 2025 e em 2026 foi logo pra liderança e agiu como se sempre tivesse sido dono da liga, mas não aguentou...',titles:[],owner:'Zuis'},
  10000010:{id:10000010,name:'Titiham Headspurs',short:'Titiham',logo:'https://i.imgur.com/w0i5nXj.png',color:'#cbd5e1',bio:'3 vitórias em 14 jogos. Recordista em ser o pior da rodada. Mas sempre o primeiro a escalar. Dedicação acima de tudo.',titles:[],owner:'Titiham'}
};

export const TEAM_IDS = Object.keys(TEAMS).map(Number);

export const CURRENT_RODADA_PC = 4;

export const LAST_CLOSED_PC_ROUND = 4;

export const CLASSICOS = { '10000004-10000002':'⚔️ CLÁSSICO DO PERDÃO', '10000004-10000006':'⚔️ CLÁSSICO DOS RAFAS' };

export const MEMBERS = [
  ['Meminetsk',10000001],['Bigão',10000002],['ValeGuiDoce',10000003],['Rafa Casa',10000004],['Manteto',10000005],['RafaLovers',10000006],['Easy Money',10000007],['Grisha',10000008],['Zuis',10000009],['Titiham',10000010]
];
