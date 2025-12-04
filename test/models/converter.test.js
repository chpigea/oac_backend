const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const converter = require('../../src/models/converter');
const fs = require('fs')

describe('Converter', () => {

  beforeEach(() => {
    
  });

  it('should convert a turtle file to a rdf/xml', (done) => {
    let inputTurtle = __dirname + '/example-01.ttl';
    let outputRdfXml = __dirname + '/example-01.xml';
    converter.turtle2RdfXml(inputTurtle, outputRdfXml).then(() => {
        let isOk = fs.existsSync(outputRdfXml)
        expect(isOk).to.be.equal(true);
        if(isOk) {
            console.log('Removing temp file: ' + outputRdfXml);
            fs.unlinkSync(outputRdfXml);
        }
        done()
    }).catch(err => {
        console.error(err);
        done();
    });
  });

})