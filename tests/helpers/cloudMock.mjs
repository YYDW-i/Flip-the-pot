import fs from 'node:fs';
import vm from 'node:vm';
export function cloudMock() {
  const docs = new Map(); let queue = Promise.resolve(), writes = 0;
  const context = { OPENID: 'trusted-user' };
  const collection = name => {
    const query = (conditions = {}, orders = [], offset = 0, size = 100, fields = null) => {
      const values = () => {
        let result = [...docs].filter(([key]) => key.startsWith(name + '/')).map(([key, data]) => ({ ...data, _id: key.slice(name.length + 1) }));
        result = result.filter(item => Object.entries(conditions).every(([key, value]) => value && value.op === 'gt' ? item[key] > value.value : item[key] === value));
        result.sort((a, b) => { for (const [key, order] of orders) { if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (order === 'desc' ? -1 : 1); } return 0; });
        return result;
      };
      return {
        doc: id => ({ get: async () => ({ data: docs.get(name + '/' + id) }), set: async ({ data }) => { docs.set(name + '/' + id, data); writes++; } }),
        where: conditions => query(conditions, orders, offset, size, fields),
        orderBy: (key, order) => query(conditions, [...orders, [key, order]], offset, size, fields),
        skip: offset => query(conditions, orders, offset, size, fields), limit: size => query(conditions, orders, offset, size, fields),
        field: fields => query(conditions, orders, offset, size, fields),
        count: async () => ({ total: values().length }),
        get: async () => ({ data: values().slice(offset, offset + size).map(item => fields ? Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, item[key]])) : item) })
      };
    };
    return query();
  };
  const db = { collection, command: { gt: value => ({ op: 'gt', value }) }, serverDate: () => new Date(), runTransaction: callback => {
    const result = queue.then(() => callback({ collection })); queue = result.catch(() => {}); return result;
  } };
  const cloud = { init() {}, database: () => db, getWXContext: () => context, DYNAMIC_CURRENT_ENV: 'env' };
  const load = name => {
    const module = { exports: {} }, helper = 'cloudfunctions/' + name + '/player.js';
    if (fs.existsSync(helper)) vm.runInNewContext(fs.readFileSync(helper, 'utf8'), { module });
    const exports = {};
    vm.runInNewContext(fs.readFileSync('cloudfunctions/' + name + '/index.js', 'utf8'), { require: id => id === 'wx-server-sdk' ? cloud : module.exports, exports, console });
    return exports.main;
  };
  return { docs, db, load, context, get writes() { return writes; } };
}
