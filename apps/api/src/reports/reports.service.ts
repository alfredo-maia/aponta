import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const tickets = await this.prisma.ticket.findMany({
      include: {
        serviceDesk: true,
      },
    });

    const statusCounts = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const departmentCounts = tickets.reduce((acc, ticket) => {
      const dept = ticket.serviceDesk ? ticket.serviceDesk.name : 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Avg resolution time (in hours) - very naive approach
    let totalResolvedHours = 0;
    let resolvedCount = 0;
    
    // CSAT Tracking
    let totalCsatScore = 0;
    let totalRated = 0;
    const csatDistribution: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };

    for (const t of tickets) {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        const diffMs = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
        totalResolvedHours += diffMs / (1000 * 60 * 60);
        resolvedCount++;
      }

      if (t.csatScore) {
        totalRated++;
        totalCsatScore += t.csatScore;
        csatDistribution[String(t.csatScore)]++;
      }
    }
    
    const avgResolutionTime = resolvedCount > 0 ? (totalResolvedHours / resolvedCount) : 0;
    const csatAverage = totalRated > 0 ? (totalCsatScore / totalRated) : 0;

    return {
      total: tickets.length,
      statusCounts,
      departmentCounts,
      avgResolutionTimeHours: avgResolutionTime,
      csat: {
        average: csatAverage,
        distribution: csatDistribution,
        totalRated,
      }
    };
  }
}
