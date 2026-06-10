import { ComponentType } from 'react';
import { SandboxSim } from './sandbox/SandboxSim';
import { NetworkSim } from './network/NetworkSim';
import { AgentsSim } from './agents/AgentsSim';
import { CellularSim } from './cellular/CellularSim';

export interface ModuleDef {
  id: string;
  code: string;
  title: string;
  sub: string;
  desc: string;
  navLabel: string;
  component?: ComponentType;
}

export interface CategoryDef {
  index: string;
  name: string;
  blurb: string;
  modules: ModuleDef[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    index: '01',
    name: 'Fundamentos de Aprendizaje en Redes',
    blurb:
      'Cómo reglas locales simples de transferencia de información generan patrones complejos de conectividad: memoria, plasticidad y resiliencia estructural.',
    modules: [
      {
        id: 'laboratorio',
        code: 'NET·00',
        title: 'Aprendizaje en una sinapsis · Laboratorio de 2 nodos',
        sub: 'Regla de Hebb / STDP · coincidencia temporal · control de tiempo',
        desc: 'El punto de partida: dispara dos neuronas a mano, con control de tiempo, y observa cómo A «aprende» a disparar a B por coincidencia temporal.',
        navLabel: 'MÓDULO · 2 NODOS',
        component: SandboxSim,
      },
      {
        id: 'red',
        code: 'NET·01',
        title: 'Propagación de Señales y Ajuste de Pesos',
        sub: 'Aprendizaje asociativo hebbiano · pulsos · plasticidad · poda',
        desc: 'Red hebbiana de 420 nodos con pulsos de luz, pincel de inyección de señal y poda sináptica masiva.',
        navLabel: 'MÓDULO · RED HEBBIANA',
        component: NetworkSim,
      },
      {
        id: 'pso',
        code: 'NET·02',
        title: 'Optimización por Enjambre (PSO)',
        sub: 'Partículas · paisaje de coste · mínimo colectivo',
        desc: 'Partículas que negocian colectivamente el mínimo de un paisaje de coste.',
        navLabel: 'MÓDULO · PSO',
      },
      {
        id: 'celular',
        code: 'NET·03',
        title: 'Autómatas Celulares Elementales',
        sub: '256 reglas de Wolfram · 4 clases de complejidad · frontera toroidal',
        desc: 'Construye una regla local de 8 bits y observa las cuatro clases de Wolfram: orden, fractales, caos y computación al borde del caos.',
        navLabel: 'MÓDULO · AUTÓMATAS',
        component: CellularSim,
      },
    ],
  },
  {
    index: '02',
    name: 'Agentes de IA y Sistemas Tecnosociales',
    blurb:
      'Coordinación sin comunicación directa, descomposición de información (sinergia vs redundancia) y dinámicas colectivas en ecosistemas de agentes.',
    modules: [
      {
        id: 'agentes',
        code: 'AGI·01',
        title: 'Coordinación Emergente y Sinergia Informacional',
        sub: '4 agentes autónomos · sin comunicación directa · descomposición PID',
        desc: 'Cuatro agentes autónomos convergen a un objetivo común usando solo el histórico del grupo. Tres paradigmas: homogéneo, especialización e inferencia (ToM).',
        navLabel: 'MÓDULO · COORDINACIÓN',
        component: AgentsSim,
      },
      {
        id: 'cascadas',
        code: 'AGI·02',
        title: 'Cascadas de Conformismo Colectivo',
        sub: 'Umbrales sociales · avalanchas · redes de influencia',
        desc: 'Umbrales sociales y avalanchas de adopción en redes de influencia.',
        navLabel: 'MÓDULO · CASCADAS',
      },
      {
        id: 'moltbook',
        code: 'AGI·03',
        title: 'Dinámicas de Atención (Moltbook)',
        sub: 'Economía de la atención · plataformas · agentes',
        desc: 'Economía de la atención en plataformas pobladas por agentes.',
        navLabel: 'MÓDULO · MOLTBOOK',
      },
    ],
  },
];

export const MODULES: ModuleDef[] = CATEGORIES.flatMap((c) => c.modules);
export const LIVE_MODULES = MODULES.filter((m) => m.component);
