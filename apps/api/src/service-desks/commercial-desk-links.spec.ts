import { ServiceDesksService } from './service-desks.service';
import { ConflictException } from '@nestjs/common';
describe('Commercial desk changes',()=>{
 let db:any; let service:ServiceDesksService;
 beforeEach(()=>{
   db={$transaction:jest.fn(cb=>cb(db)),$queryRaw:jest.fn().mockResolvedValue([]),serviceDesk:{findUnique:jest.fn().mockResolvedValue({id:'desk',organizations:[{id:'old'}]}),update:jest.fn(),create:jest.fn().mockResolvedValue({id:'desk'})},organizationDeskEvent:{createMany:jest.fn()},ticketStage:{findFirst:jest.fn()},ticketStageTransition:{create:jest.fn()}};
   service=new ServiceDesksService(db,{} as any);
 });
 it('locks orgs before desk mutation and records relationship delta',async()=>{
   await service.update('desk',{organizationIds:['new']});
   expect(db.$transaction).toHaveBeenCalled();
   expect(db.$queryRaw).toHaveBeenCalled();
   expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.serviceDesk.update.mock.invocationCallOrder[0]);
   expect(db.organizationDeskEvent.createMany).toHaveBeenCalledWith({data:expect.arrayContaining([{organizationId:'old',serviceDeskId:'desk',linked:false},{organizationId:'new',serviceDeskId:'desk',linked:true}])});
 });
 it('refuses to overwrite relationships changed while acquiring locks',async()=>{
   db.serviceDesk.findUnique.mockResolvedValueOnce({id:'desk',organizations:[{id:'old'}]}).mockResolvedValueOnce({id:'desk',organizations:[{id:'concurrent'}]});
   await expect(service.update('desk',{active:false})).rejects.toThrow(ConflictException);
   expect(db.serviceDesk.update).not.toHaveBeenCalled();
 });
 it('audits initial client links atomically with creation',async()=>{
   await service.create({name:'Mesa',organizationIds:['new']});
   expect(db.$transaction).toHaveBeenCalled();
   expect(db.organizationDeskEvent.createMany).toHaveBeenCalledWith({data:[{organizationId:'new',serviceDeskId:'desk',linked:true}]});
 });
});
