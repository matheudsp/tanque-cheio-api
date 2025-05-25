const ESTADOS_SIGLAS_MAP: Readonly<Record<string, string>> = Object.freeze({
  "ACRE": "AC",
  "ALAGOAS": "AL",
  "AMAPÁ": "AP",
  "AMAZONAS": "AM",
  "BAHIA": "BA",
  "CEARÁ": "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPÍRITO SANTO": "ES",
  "GOIÁS": "GO",
  "MARANHÃO": "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  "PARÁ": "PA",
  "PARAÍBA": "PB",
  "PARANÁ": "PR",
  "PERNAMBUCO": "PE",
  "PIAUÍ": "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  "RONDÔNIA": "RO",
  "RORAIMA": "RR",
  "SANTA CATARINA": "SC",
  "SÃO PAULO": "SP",
  "SERGIPE": "SE",
  "TOCANTINS": "TO",
});

export function getSiglaEstado(nomeEstado: string): string {
  const estadoNormalizado = nomeEstado.trim().toUpperCase();
  const sigla = ESTADOS_SIGLAS_MAP[estadoNormalizado];

  if (!sigla) {
    throw new Error(`Estado inválido: "${nomeEstado}"`);
  }

  return sigla;
}
