const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const Splitter = require('../../../src/models/vocabolaries/splitter');


describe('Vocabolaries.Splitter', () => {
  
  beforeEach(() => {
    
  });

  it('should create a parser instance', () => {
    const splitter = new Splitter(__dirname, 'vocabolaries_2.xml');
    expect(splitter).to.be.an.instanceof(Splitter);
  });

  it('should get group of classes', () => {
    const splitter = new Splitter(__dirname, 'vocabolaries_2.xml');
    const groups = splitter.splitByClass();
    expect(Object.keys(groups).length).to.be.equal(6);
  });

  it('should get group of classes', () => {
    const splitter = new Splitter(__dirname, 'vocabolaries_2.xml', true);
    const files = splitter.splitFiles();
    expect(files.length).to.be.equal(6);
    expect(files[0].class).to.be.equal("base:I2_Belief");
    expect(files[1].class).to.be.equal("basecpm:CP42_Material_Decay");
    expect(files[2].class).to.be.equal("basecpm:CP43_Structural_Damage");
    expect(files[3].class).to.be.equal("crm:E29_Design_or_Procedure");
    expect(files[4].class).to.be.equal("crm:E55_Type");
    expect(files[5].class).to.be.equal("crm:E58_Measurement_Unit");
  });
  
});