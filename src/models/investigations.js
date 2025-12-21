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

    static search(text, limit=10, offset=0){
        return new Promise(async (resolve, reject) => {
            try{
                const sql = `SELECT id, uuid
                    FROM investigations
                    WHERE dataset_search @@ to_tsquery('simple', ?)
                        OR dataset ILIKE ?
                    LIMIT ? OFFSET ?`;
                const tsQuery = `${text}:*`;
                const ilikeQuery = `%${text}%`;
                const result = await db.raw(sql, 
                    [tsQuery, ilikeQuery, limit, offset]
                );
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
