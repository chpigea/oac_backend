const config = require('../config')
const {db, schema } = require('./db')
const table = `${schema}.users`

class Users {

    static fromAuthentication(user, password){
        console.log(user, password)
        return new Promise(async (resolve, reject) => {
            try{
                let userFound = await db(table)
                    .where(function() {
                        this.whereRaw(
                            '(username = ? AND password = md5(?))', 
                            [user, password]
                        );
                    })
                    .orWhere(function() {
                        this.whereRaw(
                            '(email = ? AND password = md5(?))', 
                            [user, password]
                        );
                    })
                    .first();
                if(userFound && userFound["is_active"]) {
                    delete userFound["password"]
                    resolve(userFound)
                }else{
                    reject(new Error("Invalid credentials"))        
                }
            }catch(e){
                reject(e)
            }
        });
    }
    
}

module.exports = Users
