const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
//const Parser = require('../../../src/models/vocabolaries/parser');
const { Parser, transformMode } = require('../../../src/models/vocabolaries/parser');


describe('Vocabolaries.Parsers', () => {
  
  beforeEach(() => {
    
  });

  it('should create a parser instance', () => {
    const parser = Parser.GET_INSTANCE();
    expect(parser).to.be.an.instanceof(Parser);
  });

  it('should parse the vocabolaries.xml file', () => {
    const parser = Parser.GET_INSTANCE();
    var xmlDoc = parser.parse(__dirname + '/vocabolaries.xml');
    expect(xmlDoc).to.not.be.null;
    let nodes = xmlDoc.find('//vocabulary');
    expect(nodes.length).to.be.equal(10);
  });

  it('should transform the vocabolaries.xml file (default)', async () => {
    const parser = Parser.GET_INSTANCE();
    var terms = await parser.transform(__dirname + '/vocabolaries.xml');
    console.log(terms.filter(n => n.indexOf('P127_has_broader_term') == -1))
    expect(terms.length).to.be.equal(246);
    expect(terms[0]).to.be.equal('<http://diagnostica/vocabularies/condizioni-ambientali> a crm:E55_Type rdfs:label "Condizioni ambientali"@it ; crm:P127_has_broader_term <http://diagnostica/vocabularies> .');
    expect(terms[1]).to.be.equal('<http://diagnostica/vocabularies/condizioni-ambientali/ambiente> a crm:E55_Type rdfs:label "Ambiente"@it ; crm:P127_has_broader_term <http://diagnostica/vocabularies/condizioni-ambientali> .');
  });

  it('should transform the vocabolaries.xml file (for insert)', async () => {
    const parser = Parser.GET_INSTANCE();
    var terms = await parser.transform(__dirname + '/vocabolaries.xml', transformMode.forInsert);
    expect(terms.length).to.be.equal(246);
    expect(terms[0]).to.be.equal('(<http://diagnostica/vocabularies/condizioni-ambientali> "Condizioni ambientali"@it <http://diagnostica/vocabularies>)');
    expect(terms[1]).to.be.equal('(<http://diagnostica/vocabularies/condizioni-ambientali/ambiente> "Ambiente"@it <http://diagnostica/vocabularies/condizioni-ambientali>)');
  });
    
  it('should get the insert query for the vocabolaries.xml file', async () => {
    const parser = Parser.GET_INSTANCE();
    var query = await parser.insertQuery(__dirname + '/vocabolaries.xml');
    expect(query.length).to.be.equal(40619);
  });

});