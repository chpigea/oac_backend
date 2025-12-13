const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
    fusekiUrl,
    fusekiUrlUpdate
} = require('../models/fusekiConfig');
const axios = require('axios');
const Fuseki = require('../models/fuseki');
const { Parser, transformMode } = require('../models/vocabolaries/parser');
const VocabParser = Parser.GET_INSTANCE();

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
 * curl -X POST -F "files=@vocabolaries.xml" http://localhost:5000/backend/fuseki/upload/vocabularies
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
    if(!xmlFile.valid){
        deleteFiles(uploadedFiles)
        return res.status(400).json({ message: 'Uploaded XML file is not valid' });
    }
    VocabParser.insertQuery(xmlFile.path).then(queries => {
        //console.log("Query to insert vocabularies: ", query);
        let results = Array(queries.length, null);
        let checkCompleted = function(){
            console.log(results)
            deleteFiles(uploadedFiles)
            let failed = results.filter(r => r.status === false);
            console.log(failed);
            if(failed.length > 0){
                let message = `Error inserting vocabularies in ${failed.length} files.`;
                return res.status(500).json({ 
                    message,
                    files: uploadedFiles,
                    results
                });
            }else{
                res.json({
                    message: 'File correctly uploaded and vocabularies updated in the triple store',
                    files: uploadedFiles
                });
            }
        }
        let fusekiCall = function(index){
            return new Promise((resolve, reject) => {
                let query = queries[index];
                try{
                    axios.post(fusekiUrlUpdate, query, {
                        headers: {
                            'Content-Type': 'application/sparql-update',
                            'Accept': 'application/sparql-results+json'
                        }
                    })
                    .then(() => {
                        resolve({
                            index, success: true, message: 'Vocabulary inserted correctly'
                        });
                    }).catch(error => {
                        let msg = (error.response?.status + error.response?.data) || error.message
                        resolve({
                            index, success: false, message: `Error from SPARQL end-point: ${msg}`
                        });
                    });
                }catch(e){
                    resolve({
                        index, success: false, message: `Error: ${e}`
                    });
                }
            })
        }
        setTimeout(async ()=>{
            for(let index=0; index<queries.length; index++){
                results[index] = await fusekiCall(index);
            }
            checkCompleted();
        })
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
    let message = 'Multiple XML files are not supported';
    if(xmlFiles.length == 0)
      message = 'No XML files uploaded';        
    return res.status(400).json({ message });  
  }

});

//---------------------------------------------------------------
router.get('/get-vocabolary-terms/:key', (req, res) => {
    const key = req.params.key;
    const rootIRI = `<http://diagnostica/vocabularies/${key}>`;

    let _query = `PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    CONSTRUCT {
        ?concept ?p ?o .
    }
    WHERE {
        ?concept (crm:P127_has_broader_term*) ${rootIRI} .
        ?concept ?p ?o .
    }`;

    let query = `PREFIX crm:  <http://www.cidoc-crm.org/cidoc-crm/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX owl:  <http://www.w3.org/2002/07/owl#>

        CONSTRUCT {

            ?concept a owl:Class ;
                    rdfs:subClassOf ?parent ;
                    skos:prefLabel ?label ;
                    skos:closeMatch ?mappedConcept .

        }
        WHERE {

            # Trovo tutti i concetti del vocabolario
            ?concept (crm:P127_has_broader_term*) ${rootIRI} .

            # Recupero l'etichetta
            OPTIONAL { ?concept rdfs:label ?label . }

            # Prelevo il parent da broader term
            OPTIONAL {
                ?concept crm:P127_has_broader_term ?parent .
            }

            # Genero un mapping verso un URI esterno
            BIND(
                IRI(CONCAT("${rootIRI}", REPLACE(STR(?concept), "^.*[/#]", "")))
                AS ?mappedConcept
            )

        }
        ORDER BY ?label`
    
    axios.post(fusekiUrl, `query=${encodeURIComponent(query)}`,{
        headers: {
            'Accept': `text/turtle`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        responseType: 'stream'
    }).then(response => {
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    }).catch(err => {
        res.status(500).json({
            success: false,
            data: null,
            message: `Error: ${err}`
        });
    });
})
//---------------------------------------------------------------

/**
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

    SELECT ?obj
    WHERE {
        ?obj rdf:type <http://www.cidoc-crm.org/cidoc-crm/E55_Type> .
    }
    ORDER BY ?obj
    LIMIT 10
    OFFSET 50
 */
//---------------------------------------------------------------
router.post('/search/by-prefix', (req, res) => {
    const query = Fuseki.getQuerySearchByPrefix(
        req.body.prefix || "",
        parseInt(req.body.limit) || 50,
        parseInt(req.body.offset) || 0
    );
    
    axios.post(fusekiUrl, `query=${encodeURIComponent(query)}`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
        }
    }).then(response => {
        const bindings = response.data.results.bindings;
        let results = []
        bindings.forEach(result => {
            if(result.node){
                var label = result.label ? result.label.value : "";
                results.push({
                    instance: result.node.value,
                    label
                });
            }
        });
        res.json({ 
            success: true, 
            data: results,
            message: null
        });
    }).catch(err => {
        console.log(err)
        res.status(500).json({
            success: false,
            data: null,
            message: `Error: ${err}`
        });
    });
    
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

// GENERAL SPARQL QUERIES ---------------------------------------------------------------

router.get("/endpoint/sparql", async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: "Missing ?query=" });

    const url = fusekiUrl + "?query=" + encodeURIComponent(query);

    axios.get(url, {
        headers: {
            'Accept': 'application/sparql-results+json'
        }
    })
    .then(response => {
        res.status(200).json(response.data);
    }).catch(error => {
        let message = (error.response?.status + error.response?.data) || error.message
        res.status(500).json({ 
            message: 'Error from SPARQL end-point: ' + message, 
            query
        });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SPARQL request failed" });
  }
});

router.post("/endpoint/sparql", async (req, res) => {
  try {
    const { query, format = "json" } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    // INVIO A FUSEKI
    axios.post(fusekiUrl, query, {
        headers: {
            "Content-Type": "application/sparql-query",
            "Accept":
                format === "xml" 
                    ? "application/sparql-results+xml"
                    : "application/sparql-results+json",
        }
    })
    .then(response => {
        if(format === "xml")
            res.send(response.data);
        else
            res.status(200).json(response.data);
    }).catch(error => {
        let message = (error.response?.status + error.response?.data) || error.message
        res.status(500).json({ 
            message: 'Error from SPARQL end-point: ' + message, 
            query
        });
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SPARQL request failed" });
  }
});

router.post('/endpoint/update', (req, res) => {
    try {
        const updateQuery =
        typeof req.body === "string"
            ? req.body
            : req.body.update;

        if (!updateQuery)
            return res.status(400).json({
                error: "Missing SPARQL UPDATE in request body"
            });

        // INVIO A FUSEKI
        axios.post(fusekiUrlUpdate, updateQuery, {
            headers: {
                'Content-Type': 'application/sparql-update',
                'Accept': 'application/sparql-results+json'
            }
        })
        .then(response => {
            res.status(200).json({
                message: 'Query update executed correctly: ' + response.data
            });
        }).catch(error => {
            let message = (error.response?.status + error.response?.data) || error.message
            res.status(500).json({ 
                message: 'Error from SPARQL end-point: ' + message, 
                query
            });
        });

    } catch (err) {
            console.error(err);
            res.status(500).json({ error: "SPARQL UPDATE request failed" });
    }
})

module.exports = router