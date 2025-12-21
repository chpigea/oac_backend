const fs = require('fs')
const path = require('path');
const FOLDER = path.join(__dirname, '..', '..', 'data', 'cache');
const PREFIX = "vocabulary-";


class Cache {

    static name(key){
        return PREFIX + key + ".ttl";
    }

    static path(key){
        return path.join(FOLDER, Cache.name(key));
    }

    static check(key){
        let _path = Cache.path(key)
        let _check = {
            exists: fs.existsSync(_path),
            path: _path
        }
        return _check
    }

    static set(key, content){
        try{
            let file = Cache.path(key);
            let fileTmp = Cache.path(key) + ".tmp";
            fs.writeFileSync(fileTmp, content);
            fs.renameSync(fileTmp, file);
            return fs.existsSync(file);
        }catch(e){
            console.log(e)
            return false;
        }
    }

    static clear(){
        try{
            const files = fs.readdirSync(FOLDER);
            for(const file of files){
                if(file.startsWith(PREFIX)){
                    let filePath = path.join(FOLDER, file)
                    fs.unlinkSync(filePath);
                }
            }
            return true;
        }catch(e){
            console.log(e)
            return false
        }
    }

}

module.exports = Cache