const fs = require('fs');
const { Parser } = require('n3');
const { DataFactory, Store } = require('n3');
const { exec } = require('child_process');

class Converter {

    static async same(inPath, outPath) {
        return new Promise((resolve, reject) => {
            fs.copyFile(inPath, outPath, (err) => {
                if (err) {
                    console.error(`Error during copying file: ${err.message}`);
                    reject(err);
                }else
                    resolve();
            }); 
        })
    }

    static async turtle2RdfXml(inTurtlePath, outRdfXmlPath) {
        return new Promise((resolve, reject) => {
            const command = `rapper -i turtle -o rdfxml "${inTurtlePath}" > "${outRdfXmlPath}"`; 
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error during conversion: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.log(`Conversion stderr: ${stderr}`);
                }
                console.log(`Conversion stdout: ${stdout}`);
                resolve();
            });
        });
    }

    static async rdfXml2Turtle(inRdfXmlPath, outTurtlePath) {
        return new Promise((resolve, reject) => {
            const command = `rapper -i rdfxml -o turtle "${inRdfXmlPath}" > "${outTurtlePath}"`; 
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error during conversion: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.log(`Conversion stderr: ${stderr}`);
                }
                console.log(`Conversion stdout: ${stdout}`);
                resolve();
            });
        });
    }

    // Funzione per generare messaggi di errore multilingua
    static generateErrorMessages(propertyName, datatype, isRelation) {
        const messages = {
        string: {
            it: `Il campo ${propertyName} deve essere una stringa e non può essere vuoto.`,
            en: `The field ${propertyName} must be a string and cannot be empty.`
        },
        integer: {
            it: `Il campo ${propertyName} deve essere un numero intero.`,
            en: `The field ${propertyName} must be an integer.`
        },
        relation: {
            it: `Il campo ${propertyName} deve essere un'istanza valida.`,
            en: `The field ${propertyName} must be a valid instance.`
        }
        };

        if (isRelation) {
            return messages.relation;
        } else if (datatype.includes('integer')) {
            return messages.integer;
        } else {
            return messages.string;
        }
    }

    // Funzione per generare lo schema SHACL da un file RDF
    static async generateShaclFromRdf(rdfFilePath, shaclFilePath) {
        // Leggi il file RDF
        const rdfData = fs.readFileSync(rdfFilePath, 'utf8');

        // Crea un parser N3 e un store RDF
        const parser = new Parser();
        const quads = parser.parse(rdfData);
        const store = new Store(quads);

        // Estrai le classi, le proprietà e i tipi di dato
        const classes = new Set();
        const properties = new Map(); // Mappa: URI proprietà → { datatypes: Set, targetClasses: Set }
        const classInstances = new Map(); // Mappa: URI classe → Set di istanze

        // Analizza i tripli per trovare classi, proprietà e relazioni
        for (const quad of store.getQuads(null, null, null, null)) {
            const { subject, predicate, object } = quad;

            // Trova le classi
            if (predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                classes.add(object.value);
                if (!classInstances.has(object.value)) {
                    classInstances.set(object.value, new Set());
                }
                classInstances.get(object.value).add(subject.value);
            }

            // Trova proprietà e tipi di dato
            if (object.termType === 'Literal') {
                const propertyUri = predicate.value;
                const datatype = object.datatype ? object.datatype.value : 'http://www.w3.org/2001/XMLSchema#string';

                if (!properties.has(propertyUri)) {
                    properties.set(propertyUri, { datatypes: new Set(), targetClasses: new Set() });
                }
                properties.get(propertyUri).datatypes.add(datatype);
            } else if (object.termType === 'NamedNode') {
                const propertyUri = predicate.value;

                if (!properties.has(propertyUri)) {
                    properties.set(propertyUri, { datatypes: new Set(), targetClasses: new Set() });
                }

                // Trova la classe dell'oggetto (se esiste)
                for (const objQuad of store.getQuads(object, DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), null, null)) {
                    properties.get(propertyUri).targetClasses.add(objQuad.object.value);
                }
            }
        }

        // Genera lo schema SHACL
        let shacl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix ex: <http://example.org/ns#> .

        `;

        // Aggiungi una shape per ogni classe
        classes.forEach((classUri) => {
            const className = classUri.split('#')[1] || classUri.split('/').pop();
            const shapeName = `ex:${className}Shape`;

            shacl += `${shapeName}
            a sh:NodeShape ;
            sh:targetClass <${classUri}> ;
        `;

            // Aggiungi le proprietà per questa classe
            properties.forEach((propertyInfo, propertyUri) => {
            // Verifica se questa proprietà è usata da istanze di questa classe
            let usedByClass = false;
            const propertyName = propertyUri.split('#')[1] || propertyUri.split('/').pop();

            // Controlla se almeno un'istanza di questa classe ha questa proprietà
            const classInstancesSet = classInstances.get(classUri) || new Set();
            for (const instance of classInstancesSet) {
                for (const quad of store.getQuads(
                    DataFactory.namedNode(instance),
                    DataFactory.namedNode(propertyUri),
                    null,
                    null
                )) {
                    usedByClass = true;
                    break;
                }
            }

            if (usedByClass) {
                shacl += ` sh:property [
                sh:name "${propertyName}" ;
                sh:description "${className}.${propertyName}" ;
                sh:path <${propertyUri}> ;
        `;

                // Aggiungi vincoli per tipi di dato
                if (propertyInfo.datatypes.size > 0) {
                const datatype = Array.from(propertyInfo.datatypes)[0]; // Prendi il primo tipo di dato
                shacl += ` sh:datatype <${datatype}> ;
        `;
                // Aggiungi messaggi di errore per il tipo di dato
                const messages = Converter.generateErrorMessages(propertyName, datatype, false);
                shacl += ` sh:message "${messages.it}"@it ;
                sh:message "${messages.en}"@en ;
        `;
                }

                // Aggiungi vincoli per classi target (relazioni)
                if (propertyInfo.targetClasses.size > 0) {
                const targetClasses = Array.from(propertyInfo.targetClasses).map(c => `<${c}>`).join(' ');
                shacl += ` sh:class [ sh:in (${targetClasses}) ] ;
        `;
                // Aggiungi messaggi di errore per le relazioni
                const messages = Converter.generateErrorMessages(propertyName, '', true);
                shacl += ` sh:message "${messages.it}"@it ;
                sh:message "${messages.en}"@en ;
        `;
                }

                // Aggiungi vincoli di cardinalità
                shacl += ` sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
        `;
            }
            });

            shacl += ` .
        `;
        });

        // Salva lo schema SHACL in un file
        fs.writeFileSync(shaclFilePath, shacl);
        console.log(`Schema SHACL generato e salvato in ${shaclFilePath}`);
    }

}

module.exports = Converter