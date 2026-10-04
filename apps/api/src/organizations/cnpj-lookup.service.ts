import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';

export interface CnpjLookupResult {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  address: {
    zipCode: string | null;
    street: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    complement: string | null;
  };
}

/**
 * Looks up company registration data by CNPJ using BrasilAPI
 * (https://brasilapi.com.br — public, free, no API key required, sourced
 * from Receita Federal data). Mirrors Tiflux's "Preenchimento inteligente"
 * CNPJ autofill on client registration.
 */
@Injectable()
export class CnpjLookupService {
  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const digits = cnpj.replace(/\D/g, '');
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { 'User-Agent': 'Aponta-Helpdesk/1.0 (+https://aponta.dmtecnologia.cloud)' },
    });

    if (response.status === 404) {
      throw new NotFoundException(`CNPJ ${cnpj} não encontrado`);
    }
    if (!response.ok) {
      throw new BadGatewayException('Falha ao consultar o CNPJ. Tente novamente mais tarde.');
    }

    const data = (await response.json()) as {
      razao_social: string;
      nome_fantasia: string | null;
      cep: string | null;
      logradouro: string | null;
      numero: string | null;
      bairro: string | null;
      municipio: string | null;
      uf: string | null;
      complemento: string | null;
    };
    return {
      cnpj: digits,
      legalName: data.razao_social,
      tradeName: data.nome_fantasia || null,
      address: {
        zipCode: data.cep || null,
        street: [data.logradouro, data.numero].filter(Boolean).join(', ') || null,
        neighborhood: data.bairro || null,
        city: data.municipio || null,
        state: data.uf || null,
        complement: data.complemento || null,
      },
    };
  }
}
