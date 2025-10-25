const path = require('path');
const Converter = require('../../../oac_backend/src/models/Converter');

const rdfFilePath = path.join(__dirname, '..', 'ontology', 'schema_v1.ttl');
const shaclFilePath = path.join(__dirname, '..', 'ontology', 'schema_v1.shacl.ttl');

Converter.generateShaclFromRdf(rdfFilePath, shaclFilePath);