const express = require('express');
const router = express.Router();
const path = require('path');   
const ONTO_FOLDER = path.join(__dirname, '..', 'ontology'); ;

router.get('/schema/:format', (req, res) => {
    console.log(`Requesting SHACL schema in format: ${req.params.format}`); 
    let format = req.params.format || 'ttl';
    let filePath = null;
    switch(format){
        case 'ttl':
            filePath = 'config.shacl.ttl'; //'schema_v1.shacl.ttl';
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



module.exports = router
