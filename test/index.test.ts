import adapterTests from "@feathersjs/adapter-tests";
import errors from "@feathersjs/errors";
import { feathers } from "@feathersjs/feathers";
import NeDB from "@seald-io/nedb";
import assert from "assert";
import path from "path";
import { NeDBService } from "../src";

const testSuite = adapterTests([
  ".options",
  ".events",
  "._get",
  "._find",
  "._create",
  "._update",
  "._patch",
  "._remove",
  ".get",
  ".get + $select",
  ".get + id + query",
  ".get + id + query id",
  ".update + id + query id",
  ".get + NotFound",
  ".find",
  ".remove",
  ".remove + $select",
  ".remove + id + query",
  ".remove + id + query id",
  ".remove + multi",
  ".remove + multi no pagination",
  ".update",
  ".update + $select",
  ".update + id + query",
  ".update + NotFound",
  ".update + query + NotFound",
  ".patch",
  ".patch + $select",
  ".patch + id + query",
  ".patch + id + query id",
  ".patch multiple",
  ".patch multiple no pagination",
  ".patch multi query same",
  ".patch multi query changed",
  ".patch + NotFound",
  ".patch + query + NotFound",
  ".create",
  ".create + $select",
  ".create multi",
  ".create ignores query",
  "internal .find",
  "internal .get",
  "internal .create",
  "internal .update",
  "internal .patch",
  "internal .remove",
  ".find + equal",
  ".find + equal multiple",
  ".find + $sort",
  ".find + $sort + string",
  ".find + $limit",
  ".find + $limit 0",
  ".find + $skip",
  ".find + $select",
  ".find + $and",
  ".find + $or",
  ".find + $and + $or",
  ".find + $in",
  ".find + $nin",
  ".find + $lt",
  ".find + $lte",
  ".find + $gt",
  ".find + $gte",
  ".find + $ne",
  ".find + $gt + $lt + $sort",
  ".find + $or nested + $sort",
  ".find + paginate",
  ".find + paginate + query",
  ".find + paginate + $limit + $skip",
  ".find + paginate + $limit 0",
  ".find + paginate + params",
  "params.adapter + paginate",
  "params.adapter + multi",
]);

const createService = (name: string, options: any) => {
  const filename = path.join("db-data", name);
  const db = new NeDB({
    filename,
    autoload: true,
  });

  return new NeDBService({
    Model: db,
    events: ["testing"],
    ...options,
  });
};

describe("NeDB Service", () => {
  const app = feathers()
    .use(
      "/people",
      createService("people", {
        whitelist: ["$regex"],
      })
    )
    .use(
      "/people-customid",
      createService("people-customid", {
        id: "customid",
      })
    );
  const service = app.service("people");

  describe("nedb params", () => {
    /*

    it("$select excludes id field if not explicitly selected (#66)", async () => {
      const mod = await service.create({
        name: "Modifier",
        age: 222,
      });
      const data = await service.find({
        query: {
          age: 222,
          $select: ["name"],
        },
      });
      await service.remove(mod._id);

      assert.ok(!data[0]._id);
    });

    it("can $select with only id (#100)", async () => {
      const mod = await service.create({
        name: "Modifier",
        age: 343,
      });
      const data = await service.find({
        query: {
          age: 343,
          $select: ["_id"],
        },
      });

      await service.remove(mod._id);
      assert.ok(data[0]._id);
      assert.ok(!data[0].name);

    });

    it("allows whitelisted parameters in query", async () => {
      const person = await service.create({
        name: "Param test",
      });

      const data = await service.find({
        query: {
          name: { $regex: /haha/ },
        },
      });
      await service.remove(person._id);

      assert.strictEqual(data.length, 0);
    });

    */

    it("throws error when model is missing", () => {
      try {
        //@ts-ignore
        const s = new NeDBService();
        throw new Error("Should never get here");
      } catch (error: any) {
        assert.strictEqual(
          error?.message,
          "NeDB datastore `Model` needs to be provided"
        );
      }
    });

    it("allows to set params.nedb to upsert", async () => {
      //@ts-ignore
      const person = await service.update(
        "testing",
        {
          name: "Upsert tester",
        },
        {
          nedb: {
            upsert: true,
          },
        }
      );
      await service.remove(person._id);

      assert.deepStrictEqual(person, {
        _id: "testing",
        name: "Upsert tester",
      });
    });

    it("allows NeDB modifiers (#59)", async () => {
      const person = await service.create({
        name: "Modifier",
        data: ["first"],
      });
      const updated = await service.update(person._id, {
        $push: { data: "second" },
      });
      await service.remove(person._id);

      //@ts-ignore
      assert.deepStrictEqual(updated.data, ["first", "second"]);
    });

    it("allows NeDB modifiers in patch (#65)", async () => {
      const service = app.service("people");

      const person = await service.create({
        name: "Modifier",
        data: ["first"],
      });
      const updated = await service.patch(person._id, {
        $push: { data: "second" },
      });
      await service.remove(person._id);

      //@ts-ignore
      assert.deepStrictEqual(updated.data, ["first", "second"]);
    });

    it("_patch sets default params", async () => {
      const person = await service.create({
        name: "Param test",
      });
      //@ts-ignore
      const patchedPerson = await service._patch(person._id, {
        name: "Updated",
      });
      await service.remove(person._id);

      assert.strictEqual(patchedPerson.name, "Updated");
    });
  });

  testSuite(app, errors, "people", "_id");
  testSuite(app, errors, "people-customid", "customid");
});
