const { Global, Module } = require('@nestjs/common');

class EventEmitter2 {
  emit() {}
  on() {}
  emitAsync() {}
}

const EventEmitterModule = {
  forRoot: () => {
    return {
      module: class {},
      providers: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
      exports: [EventEmitter2],
      global: true,
    };
  },
};

module.exports = {
  EventEmitter2,
  EventEmitterModule,
  OnEvent: () => () => {},
};
