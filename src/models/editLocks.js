const {db, schema } = require('./db')
const table = `${schema}.edit_locks`
const expiration_seconds = 300 // 5 mjinutes


class EditLocks {

    static lock(table_name, row_id, client_uuid){
        return new Promise(async (resolve, reject) => {
            try{
                let start_ts = Math.ceil(new Date().getTime()/1000)
                let end_ts = start_ts + expiration_seconds
                let sql = `INSERT INTO ${table}(
                    table_name, row_id, client_uuid,
                    locked_at_ts, expires_at_ts
                )VALUES(?, ?, ?, ?, ?)
                ON CONFLICT (table_name, row_id)
                DO UPDATE
                    SET client_uuid = EXCLUDED.client_uuid,
                    locked_at_ts = ?, expires_at_ts = ?
                WHERE ${table}.table_name = ?
                    AND ${table}.row_id = ?
                    AND ${table}.expires_at_ts < ?   
                RETURNING client_uuid  
                `
                const result = await db.raw(sql, [
                    table_name, row_id, client_uuid, start_ts, end_ts,
                    start_ts, end_ts,
                    table_name, row_id, start_ts
                ])
                let reserver_uuid = null
                if(result.rows.length){
                    reserver_uuid = result.rows[0]["client_uuid"]
                }
                console.log(reserver_uuid)
                resolve(reserver_uuid == client_uuid)
            }catch(e){
                console.log(e)
                reject(e)
            }
        }); 
    }

    static extendLock(table_name, row_id, client_uuid){
        return new Promise(async (resolve, reject) => {
            try{
                const cur_ts = Math.ceil((new Date()).getTime()/1000)
                const updated = await db(table).
                    where({ table_name, row_id, client_uuid })
                    .andWhere('expires_at_ts', '>', cur_ts)
                    .update({
                        expires_at_ts: cur_ts + expiration_seconds
                    })
                if(updated == 0)    
                    resolve(false)
                else
                    resolve(true)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static delete(table_name, row_id, client_uuid){
        return new Promise(async (resolve, reject) => {
            try {
                await db(table).where(
                    {table_name, row_id, client_uuid}
                ).delete()
                resolve(true)
            }catch(e){
                reject(e)
            }
        }); 
    }

}

module.exports = EditLocks
