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

  it('should convert a turtle string to sparql UPSERT', (done) => {
    let inputTurtle = fs.readFileSync(__dirname + '/example-investigation-01.ttl', 'utf8');
    let sparql = converter.turtle2Sparql(inputTurtle)
    expect(sparql).to.be.a('string');
    expect(sparql.length).to.be.greaterThan(0);
    //console.log(sparql);
    done();
  });

  it('should convert a turtle string to Custom RDF/Xml', (done) => {
    let inputTurtle = fs.readFileSync(__dirname + '/example-investigation-02.ttl', 'utf8');
    converter.turtle2RdfXmlCustom(inputTurtle).then((sparql) => { 
      expect(sparql).to.be.a('string');
      expect(sparql.length).to.be.greaterThan(0);
      console.log(sparql);
      done();
    })
  });

})