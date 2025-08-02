const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const Parser = require('../../../src/models/vocabolaries/parser');


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

  it('should transform the vocabolaries.xml file', async () => {
    const parser = Parser.GET_INSTANCE();
    var terms = await parser.transform(__dirname + '/vocabolaries.xml');
    expect(terms.length).to.be.equal(193);
    expect(terms[0]).to.be.equal('http://diagnostica/condizioni-ambientali/ambiente/buio rdfs:label "Buio"@it');
    expect(terms[1]).to.be.equal('http://diagnostica/condizioni-ambientali/ambiente/illuminato rdfs:label "Illuminato"@it');
  });
    
});