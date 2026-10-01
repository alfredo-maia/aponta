import { HolidaysImportService } from './holidays-import.service';

describe('HolidaysImportService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches national holidays for a year from BrasilAPI and maps them to {date, name}', async () => {
    const mockResponse = [
      { date: '2026-01-01', name: 'Confraternização mundial', type: 'national' },
      { date: '2026-02-16', name: 'Carnaval', type: 'national' },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }) as unknown as typeof fetch;

    const service = new HolidaysImportService();
    const result = await service.fetchNationalHolidays(2026);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/feriados/v1/2026',
    );
    expect(result).toEqual([
      { date: '2026-01-01', name: 'Confraternização mundial' },
      { date: '2026-02-16', name: 'Carnaval' },
    ]);
  });

  it('throws a descriptive error when BrasilAPI responds with a non-OK status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const service = new HolidaysImportService();

    await expect(service.fetchNationalHolidays(2026)).rejects.toThrow(
      /BrasilAPI/,
    );
  });

  it('throws a descriptive error when the network call fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const service = new HolidaysImportService();

    await expect(service.fetchNationalHolidays(2026)).rejects.toThrow(
      /BrasilAPI/,
    );
  });

  it('rejects years outside a sane range without calling the network', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const service = new HolidaysImportService();

    await expect(service.fetchNationalHolidays(1899)).rejects.toThrow(
      /year/i,
    );
    await expect(service.fetchNationalHolidays(2200)).rejects.toThrow(
      /year/i,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
