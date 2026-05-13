import { DashboardData } from './types';

export const mockDataEn: DashboardData = {
  status: {
    state: 'OPEN',
    tensionLevel: 'ELEVATED',
    lastUpdated: new Date().toISOString(),
    confidence: 0.91,
    reason: 'Maritime traffic operational. Elevated diplomatic tension due to Iranian naval exercises.'
  },
  metrics: {
    brentPrice: 78.45,
    brentChange: 1.23,
    brentChangePercent: 1.59,
    eventsLast24h: 0,
    eventsChange: 0,
    lastIncident: '2026-05-09T14:22:00Z'
  },
  news: [
    { id: 'n1', title: 'US Navy increases patrol in Persian Gulf after incident', source: 'Reuters', publishedAt: '2026-05-10T18:30:00Z', url: '#', sentiment: 'negative', relevance: 0.92 },
    { id: 'n2', title: 'Iran conducts naval exercises in Strait of Hormuz', source: 'Al Jazeera', publishedAt: '2026-05-10T12:15:00Z', url: '#', sentiment: 'negative', relevance: 0.88 },
    { id: 'n3', title: 'OPEC maintains stable oil demand forecast', source: 'Bloomberg', publishedAt: '2026-05-09T09:45:00Z', url: '#', sentiment: 'neutral', relevance: 0.65 },
    { id: 'n4', title: 'British oil tanker crosses Hormuz without incident', source: 'BBC', publishedAt: '2026-05-08T22:10:00Z', url: '#', sentiment: 'positive', relevance: 0.71 }
  ],
  timeline: [
    { id: 'e1', date: '2026-05-09T14:22:00Z', title: 'Attempted seizure of merchant vessel', description: 'Iranian Revolutionary Guard forces boarded a British ship in the strait. Vessel released after 4 hours.', category: 'incident', severity: 'high', source: 'MarineTraffic' },
    { id: 'e2', date: '2026-05-08T09:00:00Z', title: 'Naval exercises "Zolfaghar" initiated', description: 'Iran begins large-scale military exercises in the Persian Gulf, including areas near the strait.', category: 'military', severity: 'medium', source: 'Tasnim News' },
    { id: 'e3', date: '2026-05-05T16:30:00Z', title: 'UN Security Council emergency meeting', description: 'Council discusses tensions in the Persian Gulf. US requests increased international patrols.', category: 'diplomatic', severity: 'medium', source: 'UN News' },
    { id: 'e4', date: '2026-04-28T11:00:00Z', title: 'Drone attacks oil facility in Abu Dhabi', description: 'Drone strike hits ADNOC facility. Yemen Houthis claim responsibility.', category: 'incident', severity: 'critical', source: 'CNN' },
    { id: 'e5', date: '2026-04-15T08:00:00Z', title: 'US sanctions affect Iranian oil exports', description: 'New sanctions reduce Iranian exports by 15%. Brent price rises 2%.', category: 'economic', severity: 'medium', source: 'Financial Times' },
    { id: 'e6', date: '2026-03-20T14:00:00Z', title: 'Collision between tanker and cargo ship', description: 'Minor collision in the strait. No spill reported. Traffic temporarily diverted.', category: 'incident', severity: 'low', source: "Lloyd's List" }
  ]
};

export const mockDataPt: DashboardData = {
  status: {
    state: 'OPEN',
    tensionLevel: 'ELEVATED',
    lastUpdated: new Date().toISOString(),
    confidence: 0.91,
    reason: 'Tráfego marítimo operacional. Tensão diplomática elevada devido a exercícios navais iranianos.'
  },
  metrics: {
    brentPrice: 78.45,
    brentChange: 1.23,
    brentChangePercent: 1.59,
    eventsLast24h: 0,
    eventsChange: 0,
    lastIncident: '2026-05-09T14:22:00Z'
  },
  news: [
    { id: 'n1', title: 'US Navy aumenta patrulha no Golfo Pérsico após incidente', source: 'Reuters', publishedAt: '2026-05-10T18:30:00Z', url: '#', sentiment: 'negative', relevance: 0.92 },
    { id: 'n2', title: 'Irã realiza exercícios navais no Estreito de Ormuz', source: 'Al Jazeera', publishedAt: '2026-05-10T12:15:00Z', url: '#', sentiment: 'negative', relevance: 0.88 },
    { id: 'n3', title: 'OPEP mantém previsão de demanda de petróleo estável', source: 'Bloomberg', publishedAt: '2026-05-09T09:45:00Z', url: '#', sentiment: 'neutral', relevance: 0.65 },
    { id: 'n4', title: 'Navio petroleiro britânico atravessa Ormuz sem incidentes', source: 'BBC', publishedAt: '2026-05-08T22:10:00Z', url: '#', sentiment: 'positive', relevance: 0.71 }
  ],
  timeline: [
    { id: 'e1', date: '2026-05-09T14:22:00Z', title: 'Tentativa de apreensão de navio mercante', description: 'Forças da Guarda Revolucionária Iraniana abordaram navio britânico no estreito. Navio liberado após 4 horas.', category: 'incident', severity: 'high', source: 'MarineTraffic' },
    { id: 'e2', date: '2026-05-08T09:00:00Z', title: 'Exercícios navais "Zolfaghar" iniciados', description: 'Irã inicia exercícios militares de grande escala no Golfo Pérsico, incluindo áreas próximas ao estreito.', category: 'military', severity: 'medium', source: 'Tasnim News' },
    { id: 'e3', date: '2026-05-05T16:30:00Z', title: 'Reunião de emergência do Conselho de Segurança da ONU', description: 'Conselho discute tensões no Golfo Pérsico. EUA pede aumento de patrulhas internacionais.', category: 'diplomatic', severity: 'medium', source: 'UN News' },
    { id: 'e4', date: '2026-04-28T11:00:00Z', title: 'Drone ataca instalação petroleira em Abu Dhabi', description: 'Ataque de drone atinge instalação da ADNOC. Houthis do Iêmen reivindicam responsabilidade.', category: 'incident', severity: 'critical', source: 'CNN' },
    { id: 'e5', date: '2026-04-15T08:00:00Z', title: 'Sanções dos EUA afetam exportação de petróleo iraniano', description: 'Novas sanções reduzem exportação iraniana em 15%. Preço do Brent sobe 2%.', category: 'economic', severity: 'medium', source: 'Financial Times' },
    { id: 'e6', date: '2026-03-20T14:00:00Z', title: 'Colisão entre petroleiro e navio de carga', description: 'Colisão menor no estreito. Nenhum derramamento reportado. Tráfego desviado temporariamente.', category: 'incident', severity: 'low', source: "Lloyd's List" }
  ]
};

export function getMockData(lang: 'en' | 'pt') {
  return lang === 'en' ? mockDataEn : mockDataPt;
}

export function getBrentHistory() {
  const data = [];
  const base = 77;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      price: base + Math.random() * 4 - 1 + (6 - i) * 0.3
    });
  }
  return data;
}

export function getVesselPositions() {
  return Array.from({ length: 15 }, () => ({
    x: Math.random(),
    y: Math.random(),
    dx: (Math.random() - 0.5) * 0.6,
    dy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 2.5 + 1.5,
  }));
}
