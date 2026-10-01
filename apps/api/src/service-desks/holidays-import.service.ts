import { Injectable, BadGatewayException, BadRequestException } from '@nestjs/common';

export interface ImportedHoliday {
  date: string;
  name: string;
}

interface BrasilApiHoliday {
  date: string;
  name: string;
  type: string;
}

const BRASIL_API_BASE = 'https://brasilapi.com.br/api/feriados/v1';
const MIN_YEAR = 1900;
const MAX_YEAR = 2199;

/**
 * Fetches Brazilian national holidays (fixed + movable, e.g. Carnaval,
 * Páscoa, Corpus Christi) from the free, open-source BrasilAPI so admins
 * don't have to type every holiday by hand. State/municipal holidays are
 * not covered by this free endpoint — admins can still add those manually
 * after importing the national set.
 */
@Injectable()
export class HolidaysImportService {
  async fetchNationalHolidays(year: number): Promise<ImportedHoliday[]> {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException(
        `year must be an integer between ${MIN_YEAR} and ${MAX_YEAR}`,
      );
    }

    let response: Response;
    try {
      response = await fetch(`${BRASIL_API_BASE}/${year}`);
    } catch {
      throw new BadGatewayException(
        'Could not reach BrasilAPI to fetch national holidays. Try again later.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `BrasilAPI returned status ${response.status} for year ${year}`,
      );
    }

    const data = (await response.json()) as BrasilApiHoliday[];
    return data.map((h) => ({ date: h.date, name: h.name }));
  }
}
