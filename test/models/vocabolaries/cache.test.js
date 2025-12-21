const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const Cache = require('../../../src/models/vocabolaries/cache');


describe('Vocabolaries.Cache', () => {
  
  beforeEach(() => {
    
  });

  it('should get the name of the cache file for a vocabulary', () => {
    let name = Cache.name("voc-1")
    expect(name).to.be.equal("vocabulary-voc-1.ttl");
  });

  it('should get the path of the cache file for a vocabulary', () => {
    let path = Cache.path("voc-1")
    console.log(path)
    expect(path.endsWith("/src/data/cache/vocabulary-voc-1.ttl")).to.be.equal(true);
  });

  it('should check if the cache file for a vocabulary exists', () => {
    let check = Cache.check("voc-1")
    expect(check.exists).to.be.equal(false);
  });

  it('should set the cache file for a vocabulary', () => {
    let check = Cache.set("voc-tmp", "test")
    expect(check).to.be.equal(true);
  });

  it('should clear the cache files for all vocabularies', () => {
    let check = Cache.clear()
    expect(check).to.be.equal(true);
  });

});