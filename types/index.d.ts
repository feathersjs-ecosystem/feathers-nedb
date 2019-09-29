// TypeScript Version: 3.0
import { Params, Paginated, Id, NullableId } from '@feathersjs/feathers';
import { AdapterService, ServiceOptions, InternalServiceMethods } from '@feathersjs/adapter-commons';

import NeDB = require('nedb');

export interface NedbServiceOptions extends ServiceOptions {
  Model: NeDB;
}

export class Service<T = any> extends AdapterService<T> implements InternalServiceMethods<T> {
  options: NedbServiceOptions;

  constructor(config?: Partial<NedbServiceOptions>);
  getModel(params: Params): NeDB;

  _find(params?: Params): Promise<T | T[] | Paginated<T>>;
  _get(id: Id, params?: Params): Promise<T>;
  _create(data: Partial<T> | Array<Partial<T>>, params?: Params): Promise<T | T[]>;
  _update(id: NullableId, data: T, params?: Params): Promise<T>;
  _patch(id: NullableId, data: Partial<T>, params?: Params): Promise<T>;
  _remove(id: NullableId, params?: Params): Promise<T>;
}

declare const nedb: ((config?: Partial<NedbServiceOptions>) => Service);
export default nedb;
