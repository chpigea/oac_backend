const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

class Splitter {

    constructor(xmlFolder, xmlName, skipWrite=false) {
        this.xmlFolder = xmlFolder;
        this.xmlName = xmlName;
        this.skipWrite = skipWrite;
        const xmlPath = path.join(this.xmlFolder, this.xmlName);
        this.xml = fs.readFileSync(xmlPath, 'utf8');
        // Parser
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
    }

    splitByClass() {
        const data = this.parser.parse(this.xml);
        const vocabularies = data.vocabularies.vocabulary;

        // Normalizza a array
        const vocabArray = Array.isArray(vocabularies)
            ? vocabularies
            : [vocabularies];

        // Raggruppa per class
        const grouped = {};
        for (const vocab of vocabArray) {
            const cls = vocab['@_class'] || 'NO_CLASS';
            if (!grouped[cls]) grouped[cls] = [];
            grouped[cls].push(vocab);
        }

        return grouped;
    }

    splitFiles() {
        const grouped = this.splitByClass();
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true,
            indentBy: '  '
        });
        let index = 0
        let results = [];
        for (const cls in grouped) {
            const outObj = {
                vocabularies: {
                    vocabulary: grouped[cls]
                }
            };
            index++;
            const xmlOut = builder.build(outObj);
            const xmlOutPath = path.join(this.xmlFolder, `${this.xmlName}_split_${index}.xml`);    
            if(!this.skipWrite)
                fs.writeFileSync(xmlOutPath, xmlOut, 'utf8');
            results.push({ class: cls, path: xmlOutPath, status:null, message:null });
        }
        return results.sort((a, b) => a.class.localeCompare(b.class));
    }

}


module.exports = Splitter;
