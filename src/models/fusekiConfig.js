const config = require('../config')
const configFuseki = config.fuseki || {
    "protocol": "http",
    "host": "127.0.0.1",
    "port": "3030",
    "dataset": "oac"
}
const fusekiUrlDataset = `${configFuseki.protocol}://${configFuseki.host}:${configFuseki.port}/${configFuseki.dataset}`;
const fusekiUrl = `${fusekiUrlDataset}/sparql`;
const fusekiUrlUpdate = `${fusekiUrlDataset}/update`;

module.exports = {
    fusekiUrlDataset,
    fusekiUrl,
    fusekiUrlUpdate
}