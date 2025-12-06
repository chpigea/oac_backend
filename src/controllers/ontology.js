const express = require('express');
const router = express.Router();
const path = require('path');   
const fs = require('fs');   
const ONTO_FOLDER = path.join(__dirname, '..', 'ontology');
const Converter = require('../models/converter');
const tmp = require('tmp');

router.get('/schema/:format', (req, res) => {
    console.log(`Requesting SHACL schema in format: ${req.params.format}`); 
    let format = req.params.format || 'ttl';
    let filePath = null;
    switch(format){
        case 'ttl':
            filePath = 'config.shacl.ttl'; //'schema_v1.shacl.ttl';
            res.setHeader('Content-Type', 'text/turtle');
            break;
        case 'ttl2':
            filePath = 'schema_v2.shacl.ttl';
            res.setHeader('Content-Type', 'text/turtle');
            break;
        case 'jsonld':
            filePath = 'schema_v1.shacl.jsonld';
            res.setHeader('Content-Type', 'application/ld+json');
            break;
        case 'xml':
            filePath = 'schema_v1.shacl.rdf';
            res.setHeader('Content-Type', 'application/rdf+xml');
            break;
        default:
            res.status(400).json({
                success: false,
                data: null,
                message: `Unsupported format: ${format}`
            });
            return;
    }

    let fileContent = fs.readFileSync(path.join(ONTO_FOLDER, filePath), 'utf8');
    let protocol = process.env.OAC_EXPOSED_PROTOCOL || 'http';
    let host = process.env.OAC_EXPOSED_HOST || '127.0.0.1';
    if(host=="localhost") host="127.0.0.1";
    let port = process.env.OAC_EXPOSED_PORT || '4000';
    fileContent = fileContent.replace(/OAC_EXPOSED_PROTOCOL/g, protocol);
    fileContent = fileContent.replace(/OAC_EXPOSED_HOST/g, host);
    fileContent = fileContent.replace(/OAC_EXPOSED_PORT/g, port);

    const tempFile = tmp.fileSync({ postfix: filePath });
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
