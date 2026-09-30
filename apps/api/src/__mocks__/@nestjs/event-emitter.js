class EventEmitter2 {
  emit() { return false; }
  on() { return this; }
  emitAsync() { return Promise.resolve([]); }
}

const EventEmitterModule = {
  forRoot: () => {
    return {
      module: class DummyModule {},
      providers: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
      exports: [EventEmitter2],
      global: true,
    };
  },
};

module.exports = {
  EventEmitter2,
  EventEmitterModule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  OnEvent: (event) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (target, propertyKey, descriptor) => {
      // Dummy decorator implementation
    };
  },
};
