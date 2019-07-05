import { default as createService, Service } from 'feathers-memory';
import * as NeDB from 'nedb';

const Model = new NeDB({
  filename: './data/messages.db',
  autoload: true
});

const service1 = createService();
const service2 = new Service({ Model });

service1._find({});

service2.getModel({}) instanceof NeDB;
