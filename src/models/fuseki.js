class Fuseki {

    /**
     * Return the query to retrieve the definition of an entity
     * @param {string} entityUrl 
     * @returns 
     */
    static getQueryDownload(entityUrl){
        //http://diagnostica/campione/1    
        return `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX foaf: <http://xmlns.com/foaf/0.1/>
            PREFIX schema: <http://schema.org/>

            CONSTRUCT {
                <${entityUrl}> ?p1 ?o1 .
                ?o1 ?p2 ?o2 .
                ?o2 ?p3 ?o3 .
                ?o3 ?p4 ?o4 .
            }
            WHERE {
                <${entityUrl}> ?p1 ?o1 .
                OPTIONAL {
                    ?o1 ?p2 ?o2 .
                    OPTIONAL {
                        ?o2 ?p3 ?o3 .
                        OPTIONAL {
                            ?o3 ?p4 ?o4 .
                        }
                    }
                }
            }
        `;
    }

    static getQueryDownload2(entityUrl, depth = 3) {
        const prefixes = `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX foaf: <http://xmlns.com/foaf/0.1/>
            PREFIX schema: <http://schema.org/>
        `;

        // Generate CONSTRUCT triples
        let constructTriples = [`<${entityUrl}> ?p1 ?o1 .`];
        for (let i = 1; i <= depth; i++) {
            const subject = i === 1 ? `?o1` : `?o${i}`;
            const predicate = `?p${i + 1}`;
            const object = `?o${i + 1}`;
            constructTriples.push(`${subject} ${predicate} ${object} .`);
        }

        // Generate nested OPTIONAL blocks in WHERE
        let where = `<${entityUrl}> ?p1 ?o1 .\n`;
        let indent = '';
        for (let i = 1; i <= depth; i++) {
            const subject = i === 1 ? `?o1` : `?o${i}`;
            const predicate = `?p${i + 1}`;
            const object = `?o${i + 1}`;
            where += `${indent}OPTIONAL {\n`;
            indent += '  ';
            where += `${indent}${subject} ${predicate} ${object} .\n`;
        }
        // Close all OPTIONALs
        for (let i = 0; i < depth; i++) {
            indent = indent.slice(0, -2);
            where += `${indent}}\n`;
        }

        return `
            ${prefixes}
            CONSTRUCT {
                ${constructTriples.join('\n    ')}
            }
            WHERE {
                ${where}
            }`;
    }

    static getQuerySearchByPrefix(prefix, limit, offset){
        limit = limit || 50;
        offset = offset || 0;
        if(limit < 1) limit = 50;
        return `
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT DISTINCT ?instance ?label
            WHERE {
                # tutte le istanze con qualsiasi proprietà
                ?instance ?p ?o .
                # filtro per IRI che inizia con il prefisso specifico
                FILTER(STRSTARTS(STR(?instance), "${prefix}"))
                # filtro per IRI che termina con UUID
                #FILTER(REGEX(STR(?instance), "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"))
                # label opzionale
                OPTIONAL { ?instance rdfs:label ?label . }
            }
            ORDER BY ?label
            LIMIT ${limit}
            OFFSET ${offset}`   
    }

}

module.exports = Fuseki;