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
