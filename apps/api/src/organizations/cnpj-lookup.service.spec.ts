import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { CnpjLookupService } from './cnpj-lookup.service';

describe('CnpjLookupService', () => {
  let service: CnpjLookupService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new CnpjLookupService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws NotFoundException when the API returns 404', async () => {
    fetchMock.mockResolvedValue({ status: 404, ok: false });

    await expect(service.lookup('19131243000197')).rejects.toThrow(NotFoundException);
  });

  it('throws BadGatewayException when the API fails', async () => {
    fetchMock.mockResolvedValue({ status: 500, ok: false });

    await expect(service.lookup('19131243000197')).rejects.toThrow(BadGatewayException);
  });

  it('maps a successful response to CnpjLookupResult', async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Teste',
        cep: '01310100',
        logradouro: 'Av Paulista',
        numero: '1000',
        bairro: 'Bela Vista',
        municipio: 'Sao Paulo',
        uf: 'SP',
        complemento: 'Sala 1',
      }),
    });

    const result = await service.lookup('19.131.243/0001-97');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cnpj/v1/19131243000197',
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) }),
    );
    expect(result).toEqual({
      cnpj: '19131243000197',
      legalName: 'Empresa Teste LTDA',
      tradeName: 'Teste',
      address: {
        zipCode: '01310100',
        street: 'Av Paulista, 1000',
        neighborhood: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP',
        complement: 'Sala 1',
      },
    });
  });
});
