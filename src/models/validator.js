const { Parser, Store } = require('n3');
const SHACLValidator = require('rdf-validate-shacl').default;


class Validator {

    static turtleToDataset(turtleStr) {
        const parser = new Parser({ format: 'text/turtle' });
        const quads = parser.parse(turtleStr);
        const store = new Store();
        quads.forEach(q => store.addQuad(q));
        return store;
    }

    static async validateDataSyntax(dataContent, shapesContent) {
        const dataDS = Validator.turtleToDataset(dataContent);
        const shapesDS = Validator.turtleToDataset(shapesContent);
        const validator = new SHACLValidator(shapesDS);
        const report = await validator.validate(dataDS);
        const details = (report.results || []).map(r => ({
            focusNode: r.focusNode?.value,
            message: (r.message || []).map(m => m.value || m),
            path: r.path?.value,
            severity: r.severity?.value,
            sourceShape: r.sourceShape?.value,
            sourceConstraintComponent: r.sourceConstraintComponent?.value,
            value: r.value?.value
        }));
        return {
            conforms: report.conforms,
            details
        }
    }

}

module.exports = Validator ;