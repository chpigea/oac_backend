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

module.exports = router