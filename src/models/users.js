const nodemailer = require('nodemailer')
const config = require('../config')
const {db, schema } = require('./db')
const table = `${schema}.users`

class Users {

    static fromAuthentication(user, password){
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

    static fromUserOrEmail(userOrEmail){
        
        return new Promise(async (resolve, reject) => {
            try{
                let userFound = await db(table)
                    .where(function() {
                        this.whereRaw(
                            '(username = ? OR email = ?)', 
                            [userOrEmail, userOrEmail]
                        );
                    })
                    .first();
                if(userFound && userFound["is_active"]) {
                    delete userFound["password"]
                    resolve(userFound)
                }else{
                    reject(new Error("User not found or not active"))        
                }
            }catch(e){
                reject(e)
            }
        });
    }
    
    static find(id){
       return new Promise(async (resolve, reject) => {
            try{
                let fields = '*'
                if(id){
                    console.log("SINGLE USER: " + id)
                    const user = await db(table).select(fields)
                        .where({ id }).first();
                    if(user){
                        const { password, ...safeUser } = user;   
                        resolve(safeUser) 
                    }else{
                        resolve(null)
                    }
                }else{
                    console.log("ALLL USERS")
                    const users = await db(table).select(fields).orderByRaw('id ASC')  ;
                    const safeUsers = users.map(({ password, ...rest }) => rest);
                    resolve(safeUsers)
                }
            }catch(e){
                reject(e)
            }
        }); 
    }

    static add(user){
        return new Promise(async (resolve, reject) => {
            try{
                user.password = db.raw('md5(?)', [user.password])
                const [id] = await db(table).insert(user).returning('id');
                resolve(id)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static delete(id){
        return new Promise(async (resolve, reject) => {
            try{
                const deletedCount = await db(table).where({ id }).del();
                resolve(deletedCount)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static update(user){
        return new Promise(async (resolve, reject) => {
            try{
                if(user.password)
                    user.password = db.raw('md5(?)', [user.password])
                const count = await db(table)
                    .where({ id: user.id })
                    .update(user);
                resolve(count)
            }catch(e){
                reject(e)
            }
        }); 
    }

    static setPasswordRecoveryToken(id, resetToken) {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db(table)
                .where({ id })
                .update({
                    id,
                    reset_token: resetToken,
                    reset_token_expiration: Math.ceil(60*60*24 + (new Date().getTime())/1000)
                });
                resolve();
            } catch (e) {
                reject(e);
            }            
        });
    }

}

module.exports = Users
