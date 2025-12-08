const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const Validator = require('../../src/models/validator');
const fs = require('fs')

describe('Validator', () => {

  const shaclTurtle = `
    @prefix ex: <http://example.com/ns#> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ex:PersonShape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
            sh:path ex:age ;
            sh:datatype xsd:integer ; # Richiede un intero
        ] .
  `;

  beforeEach(() => {
    
  });

  it('should convert a turtle into a Dataset with 3 triples', () => {
    const inputTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject1 ex:predicate1 ex:object1 .
      ex:subject2 ex:predicate2 ex:object2 .
      ex:subject3 ex:predicate3 ex:object3 .
    `;

    const ds = Validator.turtleToDataset(inputTurtle);

    // Controlla che siano presenti 3 triple
    expect(ds.size).to.equal(3);

    // Controllo opzionale: verifica che i soggetti siano corretti
    const subjects = Array.from(ds).map(q => q.subject.value);
    expect(subjects).to.include.members([
      'http://example.org/subject1',
      'http://example.org/subject2',
      'http://example.org/subject3'
    ]);
  });

  it('should fail for turtle with wrong age type', async () => {
    const wrongTurtle = `
      @prefix ex: <http://example.com/ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      ex:Alice a ex:Person ;
          ex:age "dodici" . # Valore letterale non valido per xsd:integer
    `;
    const result = await Validator.validateDataSyntax(wrongTurtle, shaclTurtle);
    expect(result.conforms).to.equal(false);
    expect(result.details.length).to.equal(1);
    expect(result.details[0].sourceConstraintComponent).to.equal('http://www.w3.org/ns/shacl#DatatypeConstraintComponent');
    expect(result.details[0].value).to.equal('dodici');
    
  });

  it('should pass for turtle with valid age type', async () => {
    const wrongTurtle = `
      @prefix ex: <http://example.com/ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      ex:Alice a ex:Person ;
          ex:age 12 . # Valore valido per xsd:integer
    `;
    const result = await Validator.validateDataSyntax(wrongTurtle, shaclTurtle);
    expect(result.conforms).to.equal(true);
    expect(result.details.length).to.equal(0);
    
  });

})