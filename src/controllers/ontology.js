const express = require('express');
const router = express.Router();
const path = require('path');   
const fs = require('fs');   
const ONTO_FOLDER = path.join(__dirname, '..', 'ontology');
const Converter = require('../models/converter');
const Validator = require('../models/validator');
const tmp = require('tmp');
const Investigations = require('../models/investigations');
const {
    fusekiUrlDataset,
    fusekiUrl,
    fusekiUrlUpdate
} = require('../models/fusekiConfig');
const axios = require('axios');

let SCHEMAS = {}

const getSchema = function(format){
    let fileContent = null;
    let filePath = null;
    let fileType = null;
    switch(format){
        case 'ttl':
            filePath = 'config.shacl.ttl'; //'schema_v1.shacl.ttl';
            fileType = 'text/turtle';
            break;
        case 'ttl2':
            filePath = 'schema_v2.shacl.ttl';
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
    let schema = getSchema(format);
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
    let schema = getSchema('ttl2');
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
    let uuid = req.body.uuid;
    try{
        let updateQuery = Converter.turtle2Sparql(dataset);
        Investigations.save({
            uuid, dataset, format: 'turtle'
        }).then( () => {
            axios.post(fusekiUrlUpdate, updateQuery, {
                headers: {
                    'Content-Type': 'application/sparql-update',
                    'Accept': 'application/sparql-results+json'
                }
            }).then(response => {
                console.log(response.data);
                res.status(200).json({
                    success: true
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
        conversionFunction = Converter.turtle2RdfXml
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
    conversionFunction(inputFile.name, outputFile.name).then(() => {
        let dt = new Date();
        let filename = `investigation-${dt.toISOString()}.${to}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(outputFile.name, (err) => {
            if (err) {
                res.status(500).json({
                    success: false,
                    data: null,
                    message: `Error sending file: ${err}`   
                });
                files = [inputFile]
            }
            files.push(outputFile.name)
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
