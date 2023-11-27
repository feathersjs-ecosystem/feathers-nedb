import {
  Id,
  NullableId,
  Paginated,
  PaginationOptions,
  Params,
} from "@feathersjs/feathers";
import { NeDBAdapterParams, NeDbAdapter } from "./adapter";

export class NeDBService<
  Result extends Record<string, any> = any,
  Data extends Record<string, any> = Partial<Result>,
  ServiceParams extends Params<any> = NeDBAdapterParams,
  PatchData = Partial<Data>
> extends NeDbAdapter<Result, Data, ServiceParams, PatchData> {
  async find(
    params?: ServiceParams & { paginate?: PaginationOptions }
  ): Promise<Paginated<Result>>;
  async find(params?: ServiceParams & { paginate: false }): Promise<Result[]>;
  async find(params?: ServiceParams): Promise<Paginated<Result> | Result[]>;
  async find(params?: ServiceParams): Promise<Paginated<Result> | Result[]> {
    if (params) {
      params.query = await this.sanitizeQuery(params);
    }

    return this._find(params);
  }

  async get(id: Id, params?: ServiceParams): Promise<Result> {
    if (params) {
      params.query = await this.sanitizeQuery(params);
    }
    return this._get(id, params);
  }

  async create(data: Data, params?: ServiceParams): Promise<Result>;
  async create(data: Data[], params?: ServiceParams): Promise<Result[]>;
  async create(
    data: Data | Data[],
    params?: ServiceParams
  ): Promise<Result | Result[]>;
  async create(
    data: Data | Data[],
    params?: ServiceParams
  ): Promise<Result | Result[]> {
    return this._create(data, params);
  }

  async update(id: Id, data: Data, params?: ServiceParams): Promise<Result> {
    if (params) {
      params.query = await this.sanitizeQuery(params);
    }
    return this._update(id, data, params);
  }

  async patch(
    id: null,
    data: PatchData,
    params?: ServiceParams
  ): Promise<Result[]>;
  async patch(id: Id, data: PatchData, params?: ServiceParams): Promise<Result>;
  async patch(
    id: NullableId,
    data: PatchData,
    params?: ServiceParams
  ): Promise<Result | Result[]>;
  async patch(
    id: NullableId,
    data: PatchData,
    params?: ServiceParams
  ): Promise<Result | Result[]> {
    if (params) {
      const { $limit, ...query } = await this.sanitizeQuery(params);
      params.query = query;
    }

    return this._patch(id, data, params);
  }

  async remove(id: Id, params?: ServiceParams): Promise<Result>;
  async remove(id: null, params?: ServiceParams): Promise<Result[]>;
  async remove(
    id: NullableId,
    params?: ServiceParams
  ): Promise<Result | Result[]>;
  async remove(
    id: NullableId,
    params?: ServiceParams
  ): Promise<Result | Result[]> {
    if (params) {
      const { $limit, ...query } = await this.sanitizeQuery(params);
      params.query = query;
    }

    return this._remove(id, params);
  }
}
