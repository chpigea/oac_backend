const express = require('express');
const router = express.Router();
const path = require('path');   
const fs = require('fs');   
const ONTO_FOLDER = path.join(__dirname, '..', 'ontology');
const Converter = require('../models/converter');
const Validator = require('../models/validator');
const tmp = require('tmp');
const Investigations = require('../models/investigations');
const EditLocks = require('../models/editLocks');

const {
    fusekiUrlDataset,
    fusekiUrl,
    fusekiUrlUpdate
} = require('../models/fusekiConfig');
const axios = require('axios');

let SCHEMAS = {}

const getSchema = function(format, req){
    let fileContent = null;
    let filePath = null;
    let fileType = null;
    switch(format){
        case 'ttl':
            filePath = 'config.shacl.ttl'; //'schema_v1.shacl.ttl';
            fileType = 'text/turtle';
            break;
        case 'editing':
            filePath = 'schema_editing.ttl';
            fileType = 'text/turtle';
            break;
        case 'advanced':
            filePath = 'schema_full_search.ttl';
            fileType = 'text/turtle';
            break;
        case 'fast_1':
        case 'fast_2':
        case 'fast_3':
        case 'fast_4':
            filePath = 'schema_' + format + '.ttl';
            fileType = 'text/turtle';
            break;
        case 'jsonld':
            filePath = 'schema_v1.shacl.jsonld';
            fileType = 'application/ld+json';
            break;
        case 'xml':
            filePath = 'schema_v1.shacl.rdf';
            fileType = 'application/rdf+xml';
            break;
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
    if(SCHEMAS.hasOwnProperty(format)){
        fileContent = SCHEMAS[format];
    }
    if(!fileContent){    
        fileContent = fs.readFileSync(path.join(ONTO_FOLDER, filePath), 'utf8');
        let protocol = process.env.OAC_EXPOSED_PROTOCOL || 'http';
        let host = process.env.OAC_EXPOSED_HOST || '127.0.0.1';
        if(host=="localhost") host="127.0.0.1";

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if(host=="127.0.0.1" && ip.includes("localhost"))
            host="localhost"

        let port = process.env.OAC_EXPOSED_PORT || '4000';
        fileContent = fileContent.replace(/OAC_EXPOSED_PROTOCOL/g, protocol);
        fileContent = fileContent.replace(/OAC_EXPOSED_HOST/g, host);
        fileContent = fileContent.replace(/OAC_EXPOSED_PORT/g, port);
        SCHEMAS[format] = fileContent;
    }
    return { content: fileContent , path: filePath, type: fileType };
}

router.get('/schema/:format', (req, res) => {
    console.log(`Requesting SHACL schema in format: ${req.params.format}`); 
    let format = req.params.format || 'ttl';
    let schema = getSchema(format, req);
    let fileContent = schema.content;
    res.setHeader('Content-Type', schema.type);
    const tempFile = tmp.fileSync({ postfix: schema.path });
    fs.writeFileSync(tempFile.name, fileContent);
    res.sendFile(tempFile.name, (err) => {
        if (err) {
            res.status(500).json({
                success: false,
                data: null,
                message: `Error sending file: ${err}`   
            });
        }
    });
});

router.get('/counter/:name', (req, res) => {
    let name = req.params.name;
    Investigations.getCounter(name).then( (count) => {
        res.json({
            success: true,
            data: count,
            message: `Counter ${name} value retrieved`   
        });
    }).catch( (err) => {
        console.log(err);
        res.status(500).json({
            success: false,
            data: null,
            message: `Error retrieving counter ${name}: ${err}`   
        });
    });
});

router.post('/validate', (req, res) => {
    let turtle = req.body.turtle;
    let schema = getSchema('editing', req);
    console.log("validate...")
    let shacl = schema.content.replace(/owl:imports/g, '#owl:imports');
    Validator.validateDataSyntax(turtle, shacl).then( (result) => {
        res.json({
            success: true,
            data: result,
            message: 'Validation completed'   
        });
    }).catch( (err) => {
        console.log(err);
        res.status(500).json({
            success: false,
            data: null,
            message: `Validation error: ${err}`   
        });
    });
}); 

router.post('/form/save', (req, res) => {
    let dataset = req.body.turtle;
    let id = req.body.uuid;
    let uuid = null;
    try{
        const processQuad = function(quad){
            if(quad.object.value == "http://indagine/" + id){
                console.log(quad.subject.value + ' => ' + quad.object.value)
                //uuid = quad.subject.value.split("/").pop()
            }
        }
        const processRoot = function(rootUuid){
            console.log("rootUuid: " + rootUuid)
            uuid = rootUuid
        }
        let updateQuery = Converter.turtle2Sparql(dataset, {processQuad, processRoot});
        Investigations.save({
            id, uuid, dataset, format: 'turtle'
        }).then( (dbResponse) => {
            axios.post(fusekiUrlUpdate, updateQuery, {
                headers: {
                    'Content-Type': 'application/sparql-update',
                    'Accept': 'application/sparql-results+json'
                }
            }).then(response => {
                console.log(response.data);
                res.status(200).json({
                    success: true, data: dbResponse.data
                });
            }).catch(error => {
                //TODO: rollback investigation save
                let message = (error.response?.status + error.response?.data) || error.message
                res.status(500).json({ 
                    message: 'Error from SPARQL end-point: ' + message, 
                    success: false
                });
            });                
        }).catch( (err) => {
            console.log("Error saving investigation: ", err);
            res.json({
                success: false,
                message: `Error: ${err}`
            });
        }); 
    }catch(e){
        res.json({
            success: false,
            message: `Error: ${e.message}`
        });
        return;
    }       
});

router.get('/form/:uuid', (req, res) => {
    let uuid = req.params.uuid;
    res.setHeader('Content-Type', 'text/turtle');
    Investigations.get(uuid).then( (response) => {
        res.send(response ? response.dataset : null);
    }).catch( (err) => {
        console.log("Error getting investigation datset: ", err);
        res.json({
            success: false,
            message: `Error: ${err}`
        });
    });    
});

router.post('/form/search', (req, res) => {
    let query = req.body.query
    let limit = req.body.limit
    let offset = req.body.offset || 0
    // Controlla se query è un numero intero (anche se stringa)
    if(!isNaN(query) && Number.isInteger(Number(query))) {
        query = 'indagine:' + query
    }
    if(limit < 1) limit = 1
    console.log("request received: " + JSON.stringify(req.body))
    Investigations.search(query, limit, offset).then((rows)=>{
        res.status(200).json({
            success: true,
            data: rows,
            message: null
        });
    }).catch((err)=>{
        res.status(500).json({
            success: false,
            data: null,
            message: `Error seraching data: ${err}`   
        });
    })
    
})
//-----------------------------------------------------------------

router.get('/form/lock/:row_id/:client_uuid', (req, res) => {
    const row_id = parseInt(req.params.row_id)
    const client_uuid = req.params.client_uuid
    EditLocks.lock('investigation', row_id, client_uuid).then((success)=>{
        res.status(200).json({
            success,
            message: success ? null : 'Record is locked by another user'
        });
    }).catch((err)=>{
        console.log(err)
        res.status(500).json({
            success: false,
            data: null,
            message: `Error locking record: ${row_id}`   
        });
    })
})

router.get('/form/lock-keep/:row_id/:client_uuid', (req, res) => {
    const row_id = parseInt(req.params.row_id)
    const client_uuid = req.params.client_uuid
    EditLocks.extendLock('investigation', row_id, client_uuid).then((success)=>{
        res.status(200).json({
            success,
            message: success ? null : 'Lock not owned or expired'
        });
    }).catch((err)=>{
        res.status(500).json({
            success: false,
            data: null,
            message: `Error keeping lock on record: ${row_id}`   
        });
    })
})

function _unlock(req, res){
    const row_id = parseInt(req.params.row_id)
    const client_uuid = req.params.client_uuid
    EditLocks.delete('investigation', row_id, client_uuid).then((success)=>{
        res.status(200).json({
            success
        });
    }).catch((err)=>{
        res.status(500).json({
            success: false,
            data: null,
            message: `Error unlocking record ${row_id}: ${err}`   
        });
    })
}

router.get('/form/unlock/:row_id/:client_uuid', (req, res) => {
    _unlock(req, res)
})

router.post('/form/unlock/:row_id/:client_uuid', (req, res) => {
    _unlock(req, res)
})



//-----------------------------------------------------------------
router.get('/schema/:type/:what', (req, res) => {
    console.log(`Requesting SHACL schema in format: ${req.params.type}`); 
    let type = req.params.type || 'config';
    let filePath = null;
    switch(type){
        case 'config':
            filePath = 'config.shacl.ttl'; //'schema_v1.shacl.ttl';
            res.setHeader('Content-Type', 'text/turtle');
            break;
        case 'form':
            filePath = req.params.what + '/form.json';
            res.setHeader('Content-Type', 'application/json');
            break;
        case 'query':
            filePath = req.params.what + '/query.json';
            res.setHeader('Content-Type', 'application/json');
            break;
        default:
            res.status(400).json({
                success: false,
                data: null,
                message: `Unsupported type: ${type}`
            });
            return;
    }
    res.sendFile(path.join(ONTO_FOLDER, 'form', filePath), (err) => {
        if (err) {
            res.status(500).json({
                success: false,
                data: null,
                message: `Error sending file: ${err}`   
            });
        }
    });
});

router.get('/schema-temp', (req, res) => {
    let filePath = 'schema_v2.shacl.ttl'; 
    res.setHeader('Content-Type', 'text/turtle');
    res.sendFile(path.join(ONTO_FOLDER, filePath), (err) => {
        if (err) {
            res.status(500).json({
                success: false,
                data: null,
                message: `Error sending file: ${err}`   
            });
        }
    });
});

router.post('/convert/:from/:to', (req, res) => {
    console.log(req.headers['content-type']);
    const from = req.params.from;
    const to = req.params.to;
    console.log(`Requesting conversion from ${from} to ${to}`); 
    let conversionFunction = null
    if(from === 'ttl' && to === 'xml'){
        conversionFunction = Converter.turtle2RdfXmlCustom
    }else if(from === 'xml' && to === 'ttl'){
        conversionFunction = Converter.rdfXml2Turtle
    }else if(from === to){
        conversionFunction = Converter.same
    }else{
        res.status(400).json({
            success: false,
            data: null,
            message: `Unsupported conversion from ${from} to ${to}`   
        }); 
        return;
    }
    const inputFile = tmp.fileSync({ postfix: `.${from}` });
    const outputFile = tmp.fileSync({ postfix: `.${to}` });
    
    let content = req.body.file
    
    fs.writeFileSync(inputFile.name, content);

    const removeFiles = function(_files){
        for(let i=0; i<_files.length; i++){
            try {
                fs.unlinkSync(_files[i]);
                console.log(`File ${_files[i]} removed`);
            } catch (e) {
                console.error(`Error deleting ${_files[i]}`, e);
            }
        }
    }
    let files = [inputFile.name];
    let input_data = inputFile.name;
    if(from === 'ttl' && to === 'xml'){
        input_data = content;
    }
    conversionFunction(input_data, outputFile.name).then(() => {
        let dt = new Date();
        let filename = `investigation-${dt.toISOString()}.${to}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(outputFile.name, (err) => {
            if (err) {
                console.log(err)
                res.status(500).json({
                    success: false,
                    data: null,
                    message: `Error sending file: ${err}`   
                });
                files = [inputFile.name]
            }else{
                files.push(outputFile.name)
            }
            removeFiles(files)
        });
    }).catch(err => {
        res.status(500).json({
            success: false,
            data: null,
            message: `Conversion error: ${err}`   
        });
        removeFiles(files)
    });
})

module.exports = router
