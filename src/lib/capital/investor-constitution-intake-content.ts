// AOC Capital — Investor Constitution Intake (/capital/constitution/new) — copy
// and question catalog. Kept separate from the form component so the exact
// wording (and the fact that it stays free of finance jargon and execution
// language) can be tested without rendering React.

import type {
  ComplexityAllowed,
  Currency,
  EmergencyReserveMonths,
  FinancialKnowledge,
  InvestorObjective,
  LiquidityRequirement,
  ProhibitedInstrument,
  RiskLevel,
  TimeHorizon,
} from "@/features/capital/domain/investor-constitution-schema";
import type { InvestorConstitutionIntakeAnswers } from "@/features/capital/domain/investor-constitution-intake";

export const INTRO_PARAGRAPHS: string[] = [
  "Before simulating portfolio strategies, AOC Capital needs to understand your goals, limits, and likely reactions.",
  "There are no right answers. The goal is to avoid building a simulation you would not be able to sustain in real life.",
  "This is for educational paper trading only and does not constitute investment advice.",
];

export type IntakeQuestionOption = { value: string; label: string };

export type IntakeQuestionField = keyof InvestorConstitutionIntakeAnswers;

export type IntakeQuestion = {
  id: number;
  field: IntakeQuestionField;
  prompt: string;
  options: IntakeQuestionOption[];
};

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 1,
    field: "purpose",
    prompt: "¿Para qué querés construir este portafolio?",
    options: [
      { value: "protect_existing_money", label: "Proteger dinero que ya tengo" },
      { value: "grow_wealth_long_term", label: "Hacer crecer patrimonio a largo plazo" },
      { value: "generate_income", label: "Generar ingresos" },
      { value: "save_for_specific_goal", label: "Ahorrar para algo específico" },
      { value: "learn_and_simulate", label: "Aprender y simular antes de invertir de verdad" },
      { value: "test_aggressive_strategies", label: "Probar estrategias más agresivas, pero sin dinero real todavía" },
      { value: "not_sure", label: "No estoy seguro" },
    ],
  },
  {
    id: 2,
    field: "horizon",
    prompt: "¿Cuándo creés que podrías necesitar usar una parte importante de este dinero?",
    options: [
      { value: "less_than_1y", label: "En menos de 1 año" },
      { value: "1_3y", label: "En 1 a 3 años" },
      { value: "3_5y", label: "En 3 a 5 años" },
      { value: "5_10y", label: "En 5 a 10 años" },
      { value: "10y_plus", label: "En más de 10 años" },
      { value: "no_clear_date", label: "No tengo fecha clara" },
    ],
  },
  {
    id: 3,
    field: "emergencyReserve",
    prompt: "Si mañana tuvieras una emergencia fuerte, ¿cuántos meses podrías cubrir tus gastos sin vender inversiones?",
    options: [
      { value: "less_than_1m", label: "Menos de 1 mes" },
      { value: "1_3m", label: "1 a 3 meses" },
      { value: "3_6m", label: "3 a 6 meses" },
      { value: "more_than_6m", label: "Más de 6 meses" },
      { value: "not_sure", label: "No estoy seguro" },
    ],
  },
  {
    id: 4,
    field: "nearTermNeed",
    prompt: "¿Este dinero podría hacerte falta para gastos importantes en los próximos 12 meses?",
    options: [
      { value: "probably_yes", label: "Sí, probablemente" },
      { value: "maybe", label: "Tal vez" },
      { value: "no", label: "No" },
      { value: "not_sure", label: "No estoy seguro" },
    ],
  },
  {
    id: 5,
    field: "riskCapacity",
    prompt: "Si este portafolio bajara 20% temporalmente, ¿qué tan grave sería para tu vida real?",
    options: [
      { value: "very_serious", label: "Muy grave; afectaría pagos o compromisos importantes" },
      { value: "uncomfortable_manageable", label: "Incómodo, pero manejable" },
      { value: "no_real_impact", label: "No me gustaría, pero no afectaría mi vida" },
      { value: "tolerable_long_term", label: "Podría tolerarlo si el plan es de largo plazo" },
      { value: "not_sure", label: "No sé" },
    ],
  },
  {
    id: 6,
    field: "emotionalReaction",
    prompt: "Imaginá que tu portafolio simulado baja 15% en un mes. ¿Qué reacción se parece más a vos?",
    options: [
      { value: "close_positions", label: "Cerraría posiciones para evitar más pérdida" },
      { value: "worried_would_change_strategy", label: "Me preocuparía mucho y buscaría cambiar la estrategia" },
      { value: "wait_but_check_daily", label: "Esperaría, pero revisaría el portafolio todos los días" },
      { value: "keep_plan_if_understood", label: "Mantendría el plan si entiendo por qué bajó" },
      { value: "increase_exposure", label: "Probablemente aprovecharía para aumentar exposición" },
    ],
  },
  {
    id: 7,
    field: "fomo",
    prompt: "Cuando ves que un activo sube mucho y todo el mundo habla de eso, ¿qué te pasa normalmente?",
    options: [
      { value: "want_in_fast", label: "Me dan ganas de entrar rápido" },
      { value: "research_first", label: "Lo investigo, pero trato de no correr" },
      { value: "distrust_when_crowded", label: "Me da desconfianza cuando ya todo el mundo habla de eso" },
      { value: "avoid_unfamiliar", label: "Prefiero no meterme en cosas que no entiendo" },
      { value: "depends_on_asset", label: "Depende del activo" },
    ],
  },
  {
    id: 8,
    field: "spendingCurrency",
    prompt: "¿En qué moneda están la mayoría de tus gastos?",
    options: [
      { value: "CRC", label: "Colones" },
      { value: "USD", label: "Dólares" },
      { value: "mixed", label: "Una mezcla de ambos" },
      { value: "other", label: "Otra" },
    ],
  },
  {
    id: 9,
    field: "measurementCurrency",
    prompt: "¿En qué moneda querés medir si tu portafolio va bien?",
    options: [
      { value: "CRC", label: "Colones" },
      { value: "USD", label: "Dólares" },
      { value: "mixed", label: "Ambos" },
      { value: "not_considered", label: "No lo había pensado" },
    ],
  },
  {
    id: 10,
    field: "concentration",
    prompt: "¿Hoy dependés mucho de una sola cosa para tu patrimonio?",
    options: [
      { value: "single_stock", label: "Sí, una empresa/acción/activo" },
      { value: "crypto", label: "Sí, crypto" },
      { value: "real_estate", label: "Sí, bienes raíces" },
      { value: "business_or_job", label: "Sí, mi negocio o trabajo" },
      { value: "diversified", label: "No, creo que estoy diversificado" },
      { value: "not_sure", label: "No estoy seguro" },
    ],
  },
  {
    id: 11,
    field: "complexity",
    prompt: "¿Con qué tipo de instrumentos te sentirías cómodo simulando?",
    options: [
      { value: "cash_or_broad_etfs", label: "Solo efectivo, fondos simples o ETFs amplios" },
      { value: "etfs_and_known_stocks", label: "ETFs y acciones conocidas" },
      { value: "individual_stocks_sectors", label: "Acciones individuales y sectores específicos" },
      { value: "small_crypto_component", label: "Crypto como una parte pequeña" },
      { value: "complex_instruments", label: "Estrategias complejas como opciones, leverage o DeFi" },
      { value: "not_sure_difference", label: "No sé bien la diferencia" },
    ],
  },
  {
    id: 12,
    field: "summary",
    prompt: "¿Cuál frase se parece más a vos?",
    options: [
      { value: "sleep_well_lower_returns", label: "Prefiero ganar menos, pero dormir tranquilo" },
      { value: "accept_ups_downs_if_plan_makes_sense", label: "Acepto subidas y bajadas si el plan tiene sentido" },
      { value: "grow_aggressively_uncomfortable", label: "Quiero crecer agresivamente, aunque el camino sea incómodo" },
      { value: "try_ideas_in_simulation_first", label: "Me interesa probar ideas, pero primero en simulación" },
      { value: "not_sure_want_to_understand", label: "No estoy seguro; quiero entender mis opciones" },
    ],
  },
];

export const RESULT_TITLE = "Your Investor Constitution v0.1";

export const OBJECTIVE_LABELS: Record<InvestorObjective, string> = {
  capital_preservation: "Protect existing capital",
  wealth_growth: "Grow wealth over time",
  income_generation: "Generate income",
  retirement: "Retirement",
  education: "Learn and simulate",
  future_purchase: "Save for a specific goal",
  controlled_speculation: "Test more aggressive ideas (simulation only)",
};

export const TIME_HORIZON_LABELS: Record<TimeHorizon, string> = {
  less_than_1y: "Less than 1 year",
  "1_3y": "1 to 3 years",
  "3_5y": "3 to 5 years",
  "5_10y": "5 to 10 years",
  "10y_plus": "More than 10 years",
};

export const LIQUIDITY_REQUIREMENT_LABELS: Record<LiquidityRequirement, string> = {
  critical: "Critical — likely needed within 12 months",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const EMERGENCY_RESERVE_LABELS: Record<EmergencyReserveMonths, string> = {
  "0_1": "Less than 1 month",
  "1_3": "1 to 3 months",
  "3_6": "3 to 6 months",
  "6_plus": "More than 6 months",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const FINANCIAL_KNOWLEDGE_LABELS: Record<FinancialKnowledge, string> = {
  basic: "Basic",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const COMPLEXITY_ALLOWED_LABELS: Record<ComplexityAllowed, string> = {
  simple: "Simple",
  moderate: "Moderate",
  advanced: "Advanced",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  CRC: "Colones (CRC)",
  USD: "US Dollars (USD)",
  mixed: "A mix of currencies",
  other: "Other",
};

export const PROHIBITED_INSTRUMENT_LABELS: Record<ProhibitedInstrument, string> = {
  crypto: "Crypto",
  single_stocks: "Single stocks",
  options: "Options",
  leverage: "Leverage",
  margin: "Margin",
  short_selling: "Short selling",
  defi: "DeFi",
  illiquid_assets: "Illiquid assets",
  thematic_etfs: "Thematic ETFs",
};
