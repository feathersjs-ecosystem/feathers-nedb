import {
  AdapterBase,
  AdapterParams,
  AdapterQuery,
  AdapterServiceOptions,
  PaginationOptions,
  getLimit,
  select,
} from "@feathersjs/adapter-commons";
import { _ } from "@feathersjs/commons";
import { BadRequest, MethodNotAllowed, NotFound } from "@feathersjs/errors";
import { Id, NullableId, Paginated } from "@feathersjs/feathers";
import NeDB from "@seald-io/nedb";
import crypto from "crypto";

function errorHandler(error: Error): any {
  throw error;
}

export interface NeDBAdapterOptions extends AdapterServiceOptions {
  Model: NeDB;
}

export interface NeDBAdapterParams<Q = AdapterQuery>
  extends AdapterParams<Q, Partial<NeDBAdapterOptions>> {
  nedb?: { upsert: boolean };
}

export class NeDbAdapter<
  Result extends Record<string, any>,
  Data extends Record<string, any> = Partial<Result>,
  ServiceParams extends NeDBAdapterParams<any> = NeDBAdapterParams,
  PatchData = Partial<Data>
> extends AdapterBase<
  Result,
  Data,
  PatchData,
  ServiceParams,
  NeDBAdapterOptions
> {
  constructor(options: NeDBAdapterOptions) {
    if (!options || !options.Model) {
      throw new Error("NeDB datastore `Model` needs to be provided");
    }
    super({
      id: "_id",
      ...options,
    });
  }

  getSelect(select: string[]) {
    if (Array.isArray(select)) {
      const result: any = { [this.id]: 1 };
      select.forEach((name) => (result[name] = 1));
      return result;
    }
    return select;
  }

  filterQuery(id: NullableId, params: ServiceParams) {
    const options = this.getOptions(params);
    const {
      $select,
      $sort,
      $limit: _limit,
      $skip = 0,
      ...query
    } = (params.query || {}) as AdapterQuery;
    const $limit = getLimit(_limit, options.paginate);
    if (id !== null) {
      query.$and = (query.$and || []).concat({
        [this.id]: id,
      });
    }

    return {
      filters: { $select, $sort, $limit, $skip },
      query,
    };
  }

  async _findOrGet(id: NullableId, params: ServiceParams) {
    return id === null ? await this._find(params) : await this._get(id, params);
  }

  normalizeId<D>(id: NullableId, data: D): D {
    if (id !== null) {
      // If not using the default Mongo _id field set the ID to its
      // previous value. This prevents orphaned documents.
      return {
        ...data,
        [this.id]: id,
      };
    }
    return data;
  }

  async _find(
    params?: ServiceParams & { paginate?: PaginationOptions }
  ): Promise<Paginated<Result>>;
  async _find(params?: ServiceParams & { paginate: false }): Promise<Result[]>;
  async _find(params?: ServiceParams): Promise<Paginated<Result> | Result[]>;
  async _find(
    params: ServiceParams = {} as ServiceParams
  ): Promise<Paginated<Result> | Result[]> {
    const { Model, paginate } = this.getOptions(params);
    const {
      filters: { $select, $sort, $limit, $skip },
      query,
    } = this.filterQuery(null, params);

    const countDocuments = async () => {
      if (paginate && paginate.default) {
        return await Model.countAsync(query);
      }
      return Promise.resolve(0);
    };

    const q = $select
      ? Model.findAsync(query, this.getSelect($select))
      : Model.findAsync(query);

    // Handle $sort
    if ($sort) {
      q.sort($sort);
    }
    // Handle $limit
    if ($limit) {
      q.limit($limit);
    }
    if ($skip) {
      q.skip($skip);
    }

    const [request, total] = await Promise.all([q, countDocuments()]);

    const page = {
      total,
      limit: $limit,
      skip: $skip || 0,
      data: $limit === 0 ? [] : ((await request) as any as Result[]),
    };

    return paginate && paginate.default ? page : page.data;
  }

  _get(
    id: NullableId,
    params: ServiceParams = {} as ServiceParams
  ): Promise<Result> {
    const { Model } = this.getOptions(params);
    const {
      query,
      filters: { $select },
    } = this.filterQuery(id, params);

    return $select
      ? Model.findOneAsync(query, this.getSelect($select))
      : Model.findOneAsync(query)
          .then((data) => {
            if (data == null) {
              throw new NotFound(`No record found for id '${id}'`);
            }
            return data;
          })
          .catch(errorHandler);
  }

  async _create(data: Data, params?: ServiceParams): Promise<Result>;
  async _create(data: Data[], params?: ServiceParams): Promise<Result[]>;
  async _create(
    data: Data | Data[],
    _params?: ServiceParams
  ): Promise<Result | Result[]>;
  async _create(
    _data: Data | Data[],
    params: ServiceParams = {} as ServiceParams
  ): Promise<Result | Result[]> {
    if (Array.isArray(_data) && !this.allowsMulti("create", params)) {
      throw new MethodNotAllowed("Can not create multiple entries");
    }

    const { Model } = this.getOptions(params);

    const addId = (item: Data) => {
      if (this.id !== "_id" && item[this.id] === undefined) {
        return Object.assign(
          {
            [this.id]: crypto.randomBytes(8).toString("hex"),
          },
          item
        );
      }
      return item;
    };

    const data = Array.isArray(_data) ? _data.map(addId) : addId(_data);

    //@ts-ignore
    return Model.insertAsync<Data>(data)
      .then(select(params, this.id))
      .catch(errorHandler);
  }

  async _update(
    id: Id,
    data: Data,
    params: ServiceParams = {} as ServiceParams
  ): Promise<Result> {
    if (id === null || Array.isArray(data)) {
      throw new BadRequest(
        "You can not replace multiple instances. Did you mean 'patch'?"
      );
    }

    const { Model } = this.getOptions(params);
    const { query } = this.filterQuery(id, params);

    const entry = _.omit(data, "_id");

    if (this.id !== "_id" || (params.nedb && params.nedb.upsert)) {
      entry[this.id] = id;
    }

    const response = await Model.updateAsync<Result>(query, entry, {
      returnUpdatedDocs: true,
      multi: false,
      ...params.nedb,
    });

    if (response.affectedDocuments == null) {
      throw new NotFound(`No record found for id '${id}'`);
    }

    if (Array.isArray(response.affectedDocuments)) {
      return response.affectedDocuments[0];
    }

    return select(params, this.id)(response.affectedDocuments);
  }

  async _patch(
    id: null,
    data: PatchData | Partial<Result>,
    params?: ServiceParams
  ): Promise<Result[]>;
  async _patch(
    id: Id,
    data: PatchData | Partial<Result>,
    params?: ServiceParams
  ): Promise<Result>;
  async _patch(
    id: NullableId,
    data: PatchData | Partial<Result>,
    _params?: ServiceParams
  ): Promise<Result | Result[]>;
  async _patch(
    id: NullableId,
    data: PatchData | Partial<Result>,
    params: ServiceParams = {} as ServiceParams
  ): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti("patch", params)) {
      throw new MethodNotAllowed("Can not patch multiple entries");
    }
    const { Model } = this.getOptions(params);

    const {
      query,
      filters: { $select, $sort, $limit, $skip },
    } = this.filterQuery(id, params);

    const updateOptions = {
      returnUpdatedDocs: true,
      multi: id == null ? true : false,
    };

    //@ts-ignore
    const updateData = Object.keys(data).reduce(
      (result: any, key: any) => {
        if (key.indexOf("$") === 0) {
          //@ts-ignore
          result[key] = data[key];
        } else if (key !== "_id" && key !== this.id) {
          //@ts-ignore
          result.$set[key] = data[key];
        }
        return result;
      },
      { $set: {} }
    );

    const response = await Model.updateAsync<Result>(
      query,
      updateData,
      updateOptions
    );

    if (response.affectedDocuments == null) {
      throw new NotFound(`No record found for id '${id}'`);
    }

    return select(params, this.id)(response.affectedDocuments);
  }

  async _remove(id: null, params?: ServiceParams): Promise<Result[]>;
  async _remove(id: Id, params?: ServiceParams): Promise<Result>;
  async _remove(
    id: NullableId,
    _params?: ServiceParams
  ): Promise<Result | Result[]>;
  async _remove(
    id: NullableId,
    params: ServiceParams = {} as ServiceParams
  ): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti("remove", params)) {
      throw new MethodNotAllowed("Can not remove multiple entries");
    }

    const { Model } = this.getOptions(params);
    const {
      query,
      filters: { $select },
    } = this.filterQuery(id, params);

    const deleteOptions = {
      multi: id == null ? true : false,
    };

    const findParams = {
      ...params,
      paginate: false,
      query: {
        ...query,
        $select,
      },
    };

    return this._findOrGet(id, findParams)
      .then(async (items) => {
        await Model.removeAsync(query, deleteOptions);
        return items;
      })
      .catch(errorHandler);
  }
}
