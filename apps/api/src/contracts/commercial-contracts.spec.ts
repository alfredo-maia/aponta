import { ContractsService } from './contracts.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContractDto } from './dto/create-contract.dto';

describe('Commercial contract conditions', () => {
  const admin = { id: 'admin', role: Role.ADMIN };
  const dto = { organizationId: 'org', type: 'HOURLY', approved: true, startsAt: '2026-01-01T00:00:00Z', hourlyRateCents: 0, serviceDeskIds: ['desk'] } as any;
  let db: any;
  let service: ContractsService;
  beforeEach(() => {
    db = {
      $transaction: jest.fn(cb => cb(db)), $queryRaw: jest.fn().mockResolvedValue([]),
      organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org', serviceDesks: [{ id: 'desk' }] }) },
      contract: { create: jest.fn().mockImplementation(({data}) => ({ id: 'c', ...data })), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({id:'c'}), findMany: jest.fn() },
      contractTerm: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      worklog: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new ContractsService(db);
  });
  it.each([{hourlyRateCents: null}, {serviceDeskIds: []}, {startsAt:null}, {type:'HOURS_LIMIT'}])('cannot approve incomplete or legacy contract %j', async patch => {
    await expect(service.create({...dto, ...patch}, admin)).rejects.toThrow(BadRequestException);
  });
  it('requires every contractual desk to be explicitly linked to its organization', async () => {
    await expect(service.create({...dto, serviceDeskIds:['foreign']}, admin)).rejects.toThrow(BadRequestException);
  });
  it('stores zero-valued immutable conditions and explicit desk scope', async () => {
    await service.create(dto, admin);
    expect(db.contract.create.mock.calls[0][0].data).toMatchObject({ approved:true, hourlyRateCents:0, serviceDesks:{connect:[{id:'desk'}]}, terms:{create:expect.objectContaining({hourlyRateCents:0,serviceDeskIds:['desk'],effectiveFrom:new Date(dto.startsAt)})} });
  });
  it('rejects condition changes that overlap already recorded effort', async () => {
    db.contract.findUnique.mockResolvedValue({...dto,id:'c',startsAt:new Date(dto.startsAt),serviceDesks:[{id:'desk'}],terms:[]});
    db.worklog.findFirst.mockResolvedValue({endTime:new Date('2026-02-02')});
    await expect(service.update('c',{hourlyRateCents:100,conditionsEffectiveAt:'2026-02-01T00:00:00Z'} as any,admin)).rejects.toThrow(ConflictException);
    expect(db.contract.update).not.toHaveBeenCalled();
  });
  it('requires strictly increasing term dates', async () => {
    db.contract.findUnique.mockResolvedValue({...dto,id:'c',startsAt:new Date(dto.startsAt),serviceDesks:[{id:'desk'}],terms:[{effectiveFrom:new Date('2026-02-01')}]});
    await expect(service.update('c',{hourlyRateCents:100,conditionsEffectiveAt:'2026-02-01T00:00:00Z'} as any,admin)).rejects.toThrow(ConflictException);
  });
  it('appends a future condition without updating or deleting prior versions', async () => {
    const prior = {effectiveFrom:new Date('2026-01-01'),hourlyRateCents:0};
    db.contract.findUnique.mockResolvedValue({...dto,id:'c',startsAt:new Date(dto.startsAt),serviceDesks:[{id:'desk'}],terms:[prior]});
    db.worklog.findFirst.mockResolvedValue({endTime:new Date('2026-02-02')});
    await service.update('c',{hourlyRateCents:100,conditionsEffectiveAt:'2026-03-01T00:00:00Z'} as any,admin);
    expect(db.contract.update.mock.calls[0][0].data).toMatchObject({hourlyRateCents:100,terms:{create:expect.objectContaining({hourlyRateCents:100,effectiveFrom:new Date('2026-03-01'),serviceDeskIds:['desk']})}});
    expect(prior.hourlyRateCents).toBe(0);
  });
  it.each([
    {type:'MONTHLY_HOURS',includedMinutes:60,monthlyFeeCents:1000,excessHourlyRateCents:null},
    {type:'FIXED_PROJECT',estimatedMinutes:120,fixedPriceCents:1000,scope:'  '},
  ])('requires complete modality conditions %j', async fields => {
    await expect(service.create({...dto,...fields},admin)).rejects.toThrow(BadRequestException);
  });
  it.each([
    {type:'MONTHLY_HOURS',includedMinutes:0,monthlyFeeCents:0,excessHourlyRateCents:0},
    {type:'FIXED_PROJECT',estimatedMinutes:0,fixedPriceCents:0,scope:'Rotina aprovada'},
  ])('accepts explicit zero-valued approved conditions %j', async fields => {
    await service.create({...dto,...fields},admin);
    expect(db.contract.create).toHaveBeenCalled();
  });
  it('prevents changing the modality of contracts with recorded work', async () => {
    db.contract.findUnique.mockResolvedValue({...dto,id:'c'});
    db.worklog.count.mockResolvedValue(1);
    await expect(service.update('c',{type:'FIXED_PROJECT'} as any,admin)).rejects.toThrow(ConflictException);
  });
  it('masks financial conditions inside historical versions for technicians', async () => {
    db.contract.findMany.mockResolvedValue([{id:'c',hourlyRateCents:100,terms:[{hourlyRateCents:100,fixedPriceCents:200}]}]);
    const result = await service.findAll({id:'a',role:Role.AGENT});
    expect(result[0]).toMatchObject({hourlyRateCents:null,terms:[{hourlyRateCents:null,fixedPriceCents:null}]});
  });
  it('lists missing conditions and company-desk links in administrative preflight', async () => {
    db.contract.findMany.mockResolvedValue([{...dto,id:'c',hourlyRateCents:null,serviceDesks:[{id:'desk'}],organization:{serviceDesks:[]}}]);
    const result = await service.preflight(admin);
    expect(result[0].issues).toEqual(expect.arrayContaining(['MISSING_HOURLY_RATE','DESK_NOT_LINKED_TO_ORGANIZATION']));
  });
  it.each([{hourlyRateCents:-1},{monthlyFeeCents:1.5},{serviceDeskIds:['bad']},{approved:'yes'},{conditionsEffectiveAt:'bad'}])('validates HTTP DTO fields %j', async invalid => {
    const errors = await validate(plainToInstance(CreateContractDto,{organizationId:'7b3df41b-32b9-43c4-8b8c-d466a8c3175a',...invalid}));
    expect(errors.length).toBeGreaterThan(0);
  });
});
