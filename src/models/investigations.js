const {db, schema } = require('./db')
const table = `${schema}.investigations`

class Investigations {

    static get(uuid){
        return new Promise(async (resolve, reject) => {
            try{
                const item = await db(table).select('*').where({ uuid }).first();
                resolve(item)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static search(text){
        return new Promise(async (resolve, reject) => {
            try{
                const sql = `SELECT uuid, dataset, dataset_search
                    FROM investigations
                    WHERE dataset_search @@ to_tsquery('simple', ?)
                        OR dataset ILIKE ?`;
                const tsQuery = `${text}:*`;
                const ilikeQuery = `%${text}%`;
                const result = await db.raw(sql, [tsQuery, ilikeQuery]);
                resolve(result.rows)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static getCounter(name){
        return new Promise(async (resolve, reject) => {
            try{
                const sql = `SELECT nextval('${name}') as count`;
                const result =  await db.raw(sql);
                const count = result.rows[0].count;
                resolve(count)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static save(item){
        item.format = item.format || 'turtle'
        return new Promise(async (resolve, reject) => {
            try {
                const existing = await db(table)
                    .where({uuid: item.uuid})
                    .first();
                let operation = existing ? 'UPDATE' : 'INSERT';
                if(existing){
                    await db(table)
                        .where({uuid: item.uuid})
                        .update(item);
                }else{
                    await db(table).insert(item);
                }    
                resolve({
                    success: true, operation
                })
            }catch(e){
                reject(e)
            }
        }); 
    }

}

module.exports = Investigations
