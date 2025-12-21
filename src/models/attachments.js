const {db, schema } = require('./db')
const table = `${schema}.attachments`

class Attachments {

    static get(id){
        return new Promise(async (resolve, reject) => {
            try{
                const item = await db(table).select('*').where({ id }).first();
                resolve(item)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static insert(attachment){
        return new Promise(async (resolve, reject) => {
            try {
                const [item] = await db(table)
                    .insert(attachment)
                    .returning('id')  
                resolve({
                    success: true, id: item.id
                })
            }catch(e){
                reject(e)
            }
        }); 
    }

    static delete(id){
        return new Promise(async (resolve, reject) => {
            try {
                await db(table).delete({id})
                resolve({success: true})
            }catch(e){
                reject(e)
            }
        }); 
    }

}

module.exports = Attachments
