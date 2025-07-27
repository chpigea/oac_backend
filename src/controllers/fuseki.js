const express = require('express');
const router = express.Router();
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