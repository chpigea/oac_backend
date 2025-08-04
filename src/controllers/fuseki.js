const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config')
const configFuseki = config.fuseki || {
    "protocol": "http",
    "host": "127.0.0.1",
    "port": "3030",
    "dataset": "oac"
}
const fusekiUrl = `${configFuseki.protocol}://${configFuseki.host}:${configFuseki.port}/${configFuseki.dataset}/sparql`;
const axios = require('axios');
const Fuseki = require('../models/fuseki');
const VocabParser = require('../models/vocabolaries/parser').GET_INSTANCE();

//---------------------------------------------------------------
const uploadFolder = path.join(__dirname, '../data/import');    
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder); // Folder where files will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: uploadStorage });
const deleteFiles = function(files){
    for(let i=0; i<files.length; i++){
        fs.unlink(files[i].path, (err) => {
            if (err) {
            console.error('Error deleting file:', files[i].path, err);
            } else {
            console.log('File deleted successfully:', files[i].path);
            }   
        });
    }
}
/**
 * Route to upload vocabulary files
 * @route POST /fuseki/upload/vocabularies
 * @param {Array} files - Array of files to be uploaded
 * @returns {Object} - Response object with message and file details
 *
 * curl -X POST -F "files=@vocabolaries.xsd" http://localhost:5000/backend/fuseki/upload/vocabularies
 * 
 * */
router.post('/upload/vocabularies', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadedFiles = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path
  }));

  const xmlFiles = uploadedFiles.filter(f => f.mimetype === 'application/xml' || f.mimetype === 'text/xml')
    .map(file => file.valid = VocabParser.validate(file.path).status)

  if(xmlFiles.length == 1) {
    let xmlFile = uploadedFiles[0];
    VocabParser.transform(xmlFile.path).then(terms => {
        console.log(terms)
        deleteFiles(uploadedFiles)
        res.json({
            message: 'File correctly uploaded',
            files: uploadedFiles
        });
    }).catch(err => {
        deleteFiles(uploadedFiles)
        console.error('Error transforming XML:', err);
        res.status(500).json({ 
            message: 'Error transforming XML:' + err.message, 
            files: uploadedFiles 
        });    
    })  
    
  }else{
    deleteFiles(uploadedFiles);
    let message = 'Multiple XML files is not supported';
    if(xmlFiles.length == 0)
      message = 'No XML files uploaded';        
    return res.status(400).json({ message });  
  }

});

//---------------------------------------------------------------
router.get('/count/entities', (req, res) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ex:  <http://www.cidoc-crm.org/extensions/crmsci/>

        SELECT ?type (COUNT(?entity) AS ?count)
        WHERE {
        ?entity rdf:type ?type .
        VALUES ?type { ex:S13_Sample ex:S5_Inference_Making }
        }
        GROUP BY ?type`
    axios.post(fusekiUrl, `query=${encodeURIComponent(query)}`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
        }
    }).then(response => {
        const bindings = response.data.results.bindings;
        let results = []
        bindings.forEach(result => {
            results.push({
                type: result.type.value,
                count: parseInt(result.count.value)
            });
        });
        res.json({ 
            success: true, 
            data: results,
            message: null
        });
    }).catch(err => {
        res.status(500).json({
            success: false,
            data: null,
            message: `Error: ${err}`
        });
    });
    
});

router.get('/export/:format/:entity/:id', (req, res) => {
    let accept = 'application/rdf+xml'
    let filename = `${req.params.entity}_${req.params.id}`;
    switch(req.params.format){
        case 'turtle':
            accept='text/turtle'
            filename += ".ttl"
            break;
        case 'json':
            accept='application/ld+json'
            filename += ".jsonld"
            break;
        case 'n-triples':
            accept='application/n-triples'
            filename += ".nt"
            break;
        case 'trig':
            accept='application/trig'
            filename += ".trig"
            break;
        default:
            filename += ".rdf"  
    }
    const uri = 'http://diagnostica/campione/1'
    const query = Fuseki.getQueryDownload2(uri, 4)
    axios.post(fusekiUrl, `query=${encodeURIComponent(query)}`,{
        headers: {
            'Accept': `${accept}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        responseType: 'stream'
    }).then(response => {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        response.data.pipe(res);
    }).catch(err => {
        res.status(500).json({
            success: false,
            data: null,
            message: `Error: ${err}`
        });
    });
    
});

module.exports = router